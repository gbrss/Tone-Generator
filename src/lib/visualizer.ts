// Visualizador compartido: osciloscopio y espectro sobre un <canvas>,
// alimentado por un AnalyserNode de la Web Audio API.

export interface VisualizerOptions {
  /** Devuelve el AnalyserNode (o null si el audio aún no se ha iniciado). */
  getAnalyser: () => AnalyserNode | null;
  /** Frecuencias (Hz) de los tonos que están sonando; se marcan en el espectro. */
  getMarkers: () => number[];
}

export interface Visualizer {
  /** Texto de estado sobre el gráfico (p. ej. "440 Hz"). */
  setInfo: (text: string) => void;
  /** Despierta la animación; se detiene sola cuando no hay sonido. */
  kick: () => void;
}

type View = 'scope' | 'spectrum';

const F_LO = 20;
const F_HI = 22000;
const SCOPE_SAMPLES = 2048;
const SETTLE_MS = 800; // sigue animando un rato tras detener, para que el gráfico decaiga a cero
const MARKS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

const fmtHz = (f: number) => (f >= 1000 ? `${f / 1000} kHz` : `${f} Hz`);

export function initVisualizer(root: HTMLElement, opts: VisualizerOptions): Visualizer {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const infoEl = root.querySelector<HTMLElement>('[data-viz-info]')!;
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-view]'));
  const g = canvas.getContext('2d')!;

  let view: View = 'scope';
  let cw = 0;
  let ch = 0;
  let rafId = 0;
  let lastActive = 0;
  let timeBuf: Float32Array<ArrayBuffer> | null = null;
  let freqBuf: Float32Array<ArrayBuffer> | null = null;

  const logX = (f: number) => (Math.log(f / F_LO) / Math.log(F_HI / F_LO)) * cw;
  const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    cw = Math.max(1, Math.round(r.width));
    ch = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFrame();
  }

  function drawGrid(colors: { grid: string; text: string }) {
    g.lineWidth = 1;
    g.strokeStyle = colors.grid;
    g.fillStyle = colors.text;
    g.font = '11px system-ui, sans-serif';
    g.beginPath();
    if (view === 'scope') {
      for (const frac of [0.25, 0.5, 0.75]) {
        const y = Math.round(ch * frac) + 0.5;
        g.moveTo(0, y);
        g.lineTo(cw, y);
      }
      g.stroke();
      g.textAlign = 'left';
      g.textBaseline = 'top';
      g.fillText('+1', 6, 4);
      g.textBaseline = 'bottom';
      g.fillText('−1', 6, ch - 4);
      return;
    }
    for (const f of MARKS) {
      const x = Math.round(logX(f)) + 0.5;
      g.moveTo(x, 0);
      g.lineTo(x, ch - 16);
    }
    for (const db of [-20, -40, -60, -80]) {
      const y = Math.round(((-10 - db) / 90) * (ch - 16)) + 0.5;
      g.moveTo(0, y);
      g.lineTo(cw, y);
    }
    g.stroke();
    g.textBaseline = 'bottom';
    // Omite etiquetas que se pisarían con la anterior (pantallas angostas)
    let lastRight = -Infinity;
    for (const f of MARKS) {
      const x = logX(f);
      const label = fmtHz(f);
      const w = g.measureText(label).width;
      const align = x < w / 2 + 2 ? 'left' : x > cw - w / 2 - 2 ? 'right' : 'center';
      const left = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
      if (left < lastRight + 6) continue;
      g.textAlign = align;
      g.fillText(label, x, ch - 2);
      lastRight = left + w;
    }
  }

  function drawScope(analyser: AnalyserNode | null, line: string) {
    const mid = ch / 2;
    g.lineWidth = 2;
    g.lineJoin = 'round';
    g.strokeStyle = line;
    g.beginPath();
    if (!analyser) {
      g.moveTo(0, mid);
      g.lineTo(cw, mid);
      g.stroke();
      return;
    }
    timeBuf ??= new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(timeBuf);
    // Disparo: busca un cruce por cero ascendente para que la onda no "tiemble".
    const limit = timeBuf.length - SCOPE_SAMPLES;
    let start = 0;
    for (let i = 1; i < limit; i++) {
      if (timeBuf[i - 1] < 0 && timeBuf[i] >= 0) { start = i; break; }
    }
    for (let x = 0; x < cw; x++) {
      const v = timeBuf[start + Math.floor((x / cw) * SCOPE_SAMPLES)] || 0;
      const y = mid - Math.max(-1, Math.min(1, v)) * mid * 0.92;
      if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }

  function drawSpectrum(analyser: AnalyserNode | null, colors: { line: string; fill: string }) {
    const plotH = ch - 16;
    if (!analyser) {
      g.strokeStyle = colors.line;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(0, plotH - 0.5);
      g.lineTo(cw, plotH - 0.5);
      g.stroke();
      return;
    }
    freqBuf ??= new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(freqBuf);
    const nyquist = analyser.context.sampleRate / 2;
    const bins = freqBuf.length;
    const dbToY = (db: number) => {
      const n = Math.max(0, Math.min(1, (db - analyser.minDecibels) / (analyser.maxDecibels - analyser.minDecibels)));
      return plotH - n * plotH;
    };
    g.beginPath();
    g.moveTo(0, plotH);
    for (let x = 0; x < cw; x++) {
      const f0 = F_LO * Math.pow(F_HI / F_LO, x / cw);
      const f1 = F_LO * Math.pow(F_HI / F_LO, (x + 1) / cw);
      const b0 = Math.min(bins - 1, Math.floor((f0 / nyquist) * bins));
      const b1 = Math.min(bins - 1, Math.max(b0, Math.floor((f1 / nyquist) * bins)));
      let peak = -Infinity;
      for (let b = b0; b <= b1; b++) if (freqBuf[b] > peak) peak = freqBuf[b];
      g.lineTo(x, dbToY(peak));
    }
    g.lineTo(cw, plotH);
    g.closePath();
    g.fillStyle = colors.fill;
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = colors.line;
    g.stroke();

    // Marcas de los tonos que están sonando
    g.setLineDash([4, 4]);
    g.lineWidth = 1;
    g.globalAlpha = 0.55;
    for (const f of opts.getMarkers()) {
      if (f < F_LO || f > F_HI) continue;
      const x = Math.round(logX(f)) + 0.5;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, plotH);
      g.stroke();
    }
    g.setLineDash([]);
    g.globalAlpha = 1;
  }

  function drawFrame() {
    if (!cw || !ch) return;
    const accent = cssVar('--accent') || '#4cc2ff';
    const colors = {
      line: accent,
      fill: `color-mix(in srgb, ${accent} 28%, transparent)`,
      grid: cssVar('--border') || '#2d3548',
      text: cssVar('--muted') || '#9aa5bd',
    };
    const analyser = opts.getAnalyser();
    g.clearRect(0, 0, cw, ch);
    drawGrid(colors);
    if (view === 'scope') drawScope(analyser, colors.line);
    else drawSpectrum(analyser, colors);
  }

  function loop(now: number) {
    drawFrame();
    if (opts.getMarkers().length > 0) lastActive = now;
    rafId = !document.hidden && now - lastActive < SETTLE_MS ? requestAnimationFrame(loop) : 0;
  }

  function kick() {
    lastActive = performance.now();
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  tabs.forEach((b) => b.addEventListener('click', () => {
    view = b.dataset.view === 'spectrum' ? 'spectrum' : 'scope';
    tabs.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    kick();
  }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', drawFrame);
  new ResizeObserver(resize).observe(canvas);
  resize();

  return {
    setInfo: (text) => { infoEl.textContent = text; },
    kick,
  };
}
