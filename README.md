# 🎵 Generador de tonos en línea

Generador de frecuencias en el navegador, hecho con [Astro](https://astro.build) y la **Web Audio API**. Produce tonos puros (y otras formas de onda) de **1 Hz a 22.000 Hz**, con control fino de la frecuencia por teclado, enlaces compartibles y sin dependencias de runtime: todo el audio se genera en el cliente.

Está inspirado en las funciones del [Online Tone Generator de Szynalski](https://www.szynalski.com/tone-generator/), reescrito desde cero y en español.

---

## Índice

- [Características](#características)
- [Stack](#stack)
- [Requisitos](#requisitos)
- [Instalación y uso](#instalación-y-uso)
- [Scripts disponibles](#scripts-disponibles)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Guía de uso](#guía-de-uso)
  - [Atajos de teclado](#atajos-de-teclado)
  - [Enlaces compartibles](#enlaces-compartibles)
- [Cómo funciona](#cómo-funciona)
- [Despliegue](#despliegue)
- [Compatibilidad de navegadores](#compatibilidad-de-navegadores)
- [Advertencia de seguridad auditiva](#advertencia-de-seguridad-auditiva)
- [Personalización](#personalización)
- [Créditos y licencia](#créditos-y-licencia)

---

## Características

- ▶️ **Reproducir / Detener** con botón o con la barra espaciadora.
- 🎚️ **Frecuencia de 1 a 22.000 Hz**:
  - Deslizador en **escala logarítmica** (más resolución en graves, que es donde el oído distingue mejor).
  - Campo de texto para escribir el valor exacto (hasta **3 decimales**, acepta coma o punto).
- ⌨️ **Ajuste fino por teclado**: pasos de 1 Hz, 0,01 Hz y 0,001 Hz.
- ➕➖ **Botones de ±1 Hz**.
- 🎼 **×½ y ×2** para bajar o subir una octava al instante.
- 🌊 **Cuatro formas de onda**: sinusoidal (tono puro), cuadrada, diente de sierra y triangular.
- 🔗 **Copiar enlace**: genera una URL que restaura la frecuencia y la onda al abrirla.
- 🔊 **Control de volumen** con respuesta cuadrática (más natural al oído) y memoria entre sesiones.
- 🪟 **Mezcla de tonos**: abre la página en varias pestañas y cada una aporta su propio tono.
- ♿ **Accesible**: etiquetas ARIA, anuncio de estado para lectores de pantalla y foco visible.
- 🌗 **Tema claro/oscuro** automático según la preferencia del sistema.
- 🎛️ **Generador de múltiples tonos** (`/multiple/`): agrega hasta **16 tonos** que suenan a la vez. Cada uno tiene su propia frecuencia, onda, volumen, **balance izquierda/derecha** y encendido/apagado; más volumen general y «Reproducir/Detener todos».
- 📈 **Gráfico en tiempo real** en ambos generadores (tono simple y múltiples tonos), con dos vistas:
  - **Onda:** osciloscopio de la señal combinada, con disparo por cruce por cero para que la imagen no tiemble (se ven los batidos y la suma de ondas).
  - **Espectro:** analizador de frecuencias en escala logarítmica (20 Hz – 22 kHz) con una marca punteada sobre cada tono encendido.
- 📚 Textos informativos en español: instrucciones, usos (afinación, pruebas de audio, tinnitus, tonos de 40 Hz) y advertencia de volumen.

## Stack

| Tecnología | Uso |
| --- | --- |
| [Astro 5](https://astro.build) | Framework, salida 100 % estática |
| TypeScript | Lógica del cliente (`<script>` de Astro) |
| Web Audio API | Generación de audio (`OscillatorNode` + `GainNode`) |
| CSS nativo | Estilos con variables y `color-mix`, sin librerías de UI |

No usa React, Vue ni ninguna otra librería de componentes: la interactividad es JavaScript/TypeScript plano.

## Requisitos

- **Node.js** 18.20+ o 20.3+ (versión mínima que pide Astro 5). Se recomienda una LTS reciente.
- **npm** (o pnpm / yarn, si prefieres).

## Instalación y uso

```bash
# 1. Clonar el repositorio
git clone <url-de-tu-repositorio>
cd tone-generator

# 2. Instalar dependencias
npm install

# 3. Levantar el servidor de desarrollo
npm run dev
```

Por defecto queda disponible en <http://localhost:4321>.

Para generar la versión de producción:

```bash
npm run build     # genera la carpeta dist/
npm run preview   # sirve dist/ localmente para probarla
```

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Compila el sitio estático en `dist/` |
| `npm run preview` | Sirve localmente el build de producción |
| `npm run astro -- <cmd>` | Acceso a la CLI de Astro (por ejemplo `astro check`) |

## Estructura del proyecto

```text
tone-generator/
├── astro.config.mjs              # Configuración de Astro
├── package.json
├── tsconfig.json                 # Extiende astro/tsconfigs/strict
├── .gitignore
├── README.md
└── src/
    ├── layouts/
    │   └── Layout.astro              # HTML base, navegación, variables de tema y estilos globales
    ├── components/
    │   ├── ToneGenerator.astro       # Generador de un tono: interfaz + lógica de audio
    │   ├── MultiToneGenerator.astro  # Generador múltiple: lista de tonos y mezcla de audio
    │   └── Visualizer.astro          # Marcado y estilos del gráfico (compartido)
    ├── lib/
    │   └── visualizer.ts             # Dibujo del osciloscopio y el espectro (canvas, compartido)
    └── pages/
        ├── index.astro               # Tono simple: textos, advertencia e instrucciones
        └── multiple.astro            # Múltiples tonos (ruta /multiple/)
```

- **`Layout.astro`** define la estructura HTML, el idioma (`es`), la meta descripción, la barra de navegación entre páginas y las variables CSS del tema claro/oscuro.
- **`ToneGenerator.astro`** contiene el marcado de los controles, sus estilos y el `<script>` con la lógica (audio, teclado, URL, volumen).
- **`MultiToneGenerator.astro`** maneja una lista dinámica de tonos (plantilla `<template>`) y la mezcla de audio.
- **`Visualizer.astro`** + **`lib/visualizer.ts`** forman el gráfico compartido por ambos generadores: el componente pone el marcado y los estilos, y `initVisualizer()` dibuja sobre el `<canvas>` a partir de un `AnalyserNode`. Cada generador solo le entrega su analizador y la lista de frecuencias sonando.
- **`index.astro`** y **`multiple.astro`** componen cada página. En `index.astro`, los enlaces del texto (por ejemplo "tonos de 40 Hz") se conectan al generador mediante un evento personalizado.

## Guía de uso

1. Pulsa **Reproducir** (o `Espacio`). El navegador solo permite iniciar audio tras una interacción del usuario, por eso el tono no arranca solo al cargar la página.
2. Ajusta la **frecuencia** con el deslizador, escribiéndola en el campo o con los atajos de teclado.
3. Elige la **forma de onda** con los botones.
4. Regula el **volumen**. Empieza bajo y sube de a poco.
5. Si quieres compartir el ajuste actual, usa **Copiar enlace**.

### Atajos de teclado

| Tecla | Acción |
| --- | --- |
| `Espacio` | Reproducir / detener |
| `←` / `→` | Mover la frecuencia un paso del deslizador (≈ 1 % en escala logarítmica) |
| `Shift` + `←` / `→` | −1 Hz / +1 Hz |
| `Ctrl` + `←` / `→` | −0,01 Hz / +0,01 Hz |
| `Ctrl` + `Shift` + `←` / `→` | −0,001 Hz / +0,001 Hz |
| `Enter` (en el campo de texto) | Confirmar el valor escrito |

> En macOS, `Cmd` funciona igual que `Ctrl` para los pasos finos.
> Los atajos de flechas y espacio se desactivan mientras escribes en el campo de frecuencia, para no interferir con la edición.

### Enlaces compartibles

El estado se refleja en el *hash* de la URL y se actualiza en vivo:

```text
https://tu-sitio.com/#440            → 440 Hz, onda sinusoidal
https://tu-sitio.com/#1000,square    → 1000 Hz, onda cuadrada
https://tu-sitio.com/#40             → 40 Hz
```

Formas de onda válidas: `sine`, `square`, `sawtooth`, `triangle`. Si omites la onda, se usa `sine`.

En el generador múltiple (`/multiple/`) el hash guarda todos los tonos con el formato `#m=<volumen general>&t=<frec>_<onda>_<volumen>_<balance>~...`:

```text
https://tu-sitio.com/multiple/#m=40&t=440_sine_30_0~443_sine_30_0~1000_square_15_-50
```

El balance va de `-100` (izquierda) a `100` (derecha). Por seguridad y porque los navegadores exigen un clic para iniciar el audio, **los tonos siempre cargan apagados**.

## Cómo funciona

El audio se construye con un grafo mínimo de la Web Audio API:

```text
OscillatorNode ──▶ GainNode ──▶ AudioContext.destination
```

Detalles de implementación:

- **Sin "clics"**: al iniciar, detener o cambiar la frecuencia/volumen se usa `setTargetAtTime` con constantes de tiempo muy cortas (10–15 ms), en vez de saltos bruscos. Al detener, el oscilador se apaga y se desconecta ~150 ms después de bajar la ganancia a cero.
- **Escala logarítmica**: el deslizador va de 0 a 1000 y se mapea con `f = 1 · (22000 / 1)^(p / 1000)`. La conversión inversa mantiene sincronizados el deslizador y el campo de texto.
- **Precisión**: la frecuencia se redondea a 3 decimales y se limita al rango 1–22.000 Hz.
- **Volumen**: la ganancia es `(volumen / 100)²`, de modo que el control se siente más lineal para el oído. El valor se guarda en `localStorage` (con `try/catch`, por si el almacenamiento está bloqueado).
- **Un solo `AudioContext`**: se crea la primera vez que se pulsa Reproducir y se reutiliza después.
- **Generador múltiple**: cada tono es su propia cadena `OscillatorNode → GainNode → StereoPannerNode`, y todas confluyen en un `GainNode` general → `DynamicsCompressorNode` (evita saturación al sumar tonos) → `AnalyserNode` → salida.
- **Gráfico**: un `requestAnimationFrame` lee el `AnalyserNode` (FFT de 8192) y dibuja en un `<canvas>` con soporte de pantallas de alta densidad. En el tono simple el analizador va entre el oscilador y la salida; en el múltiple, al final de la mezcla. La animación sigue unos 0,8 s tras detener el sonido (para que el gráfico decaiga a cero) y luego se detiene sola; también se pausa con la pestaña oculta.
- **Comunicación entre componentes**: los enlaces del texto de `index.astro` disparan un `CustomEvent` (`tone:set-frequency`) que escucha el generador.

## Despliegue

El build es **100 % estático** (`dist/`), así que se puede publicar en cualquier hosting estático.

### Cloudflare Pages

- **Build command:** `npm run build`
- **Build output directory:** `dist`

### Netlify / Vercel

- **Build command:** `npm run build`
- **Publish / output directory:** `dist`

### GitHub Pages

Si lo publicas en `https://<usuario>.github.io/<repositorio>/`, configura `site` y `base` en `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://<usuario>.github.io',
  base: '/<repositorio>',
});
```

Luego despliega el contenido de `dist/` (por ejemplo con una GitHub Action de Pages).

> **Importante:** la Web Audio API funciona en cualquier origen, pero `navigator.clipboard` (botón "Copiar enlace") requiere **HTTPS** o `localhost`. Si falla, el botón muestra un cuadro para copiar el enlace manualmente.

## Compatibilidad de navegadores

Funciona en las versiones actuales de Chrome, Edge, Firefox y Safari (escritorio y móvil). Requiere soporte de `AudioContext`, `color-mix()` en CSS y módulos ES modernos.

Notas:

- En iOS/Safari el audio solo arranca tras un toque del usuario (el botón Reproducir cumple esto).
- Muchos parlantes de teléfonos y notebooks no reproducen bien por debajo de ~100 Hz ni por encima de ~15 kHz; que no se oiga no significa que el tono no se esté generando.
- Las ondas cuadrada y diente de sierra tienen mucha energía armónica y se perciben **más fuertes** que la sinusoidal al mismo volumen.

## Advertencia de seguridad auditiva

> **Puedes dañar tu audición o tus parlantes si reproduces tonos a volúmenes extremos.**

Las personas no oímos bien por debajo de 20 Hz ni por encima de 10.000 Hz. Subir el volumen para compensar puede exponerte a niveles dañinos. Una buena práctica: anota el volumen con el que escuchas cómodamente un tono de 1.000 Hz y no te alejes mucho por encima de ese nivel, sobre todo en agudos, donde la audición es más frágil.

Esta herramienta **no es un dispositivo médico** y no garantiza ningún efecto terapéutico.

## Personalización

- **Rango de frecuencias:** cambia `MIN_F` y `MAX_F` al inicio del `<script>` en `src/components/ToneGenerator.astro`.
- **Volumen inicial:** modifica el atributo `value` del `<input id="volume">`.
- **Colores y tema:** edita las variables CSS (`--bg`, `--accent`, etc.) en `src/layouts/Layout.astro`.
- **Textos:** todo el contenido informativo está en `src/pages/index.astro`.
- **Idioma:** el sitio está en español (`<html lang="es">`); para traducirlo, ajusta ese atributo y los textos de `index.astro` y `ToneGenerator.astro`.

## Créditos y licencia

- Inspirado en el [Online Tone Generator](https://www.szynalski.com/tone-generator/) de Tomasz P. Szynalski. Este proyecto es una reimplementación independiente; no incluye código ni recursos del sitio original.
- Define aquí la licencia que prefieras para tu repositorio (por ejemplo MIT) y agrega el archivo `LICENSE` correspondiente.
