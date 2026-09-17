export type ToneName =
  | 'beep'
  | 'beep-high'
  | 'beep-low'
  | 'double-beep'
  | 'whistle'
  | 'clap'
  | 'bell'
  | 'triple-bell';

/**
 * Synthesizes simple signal sounds. Only used as a stand-in while no recorded file exists for a
 * sound, so the timer is usable before real sound files are added.
 */
export function playTone(context: AudioContext, tone: ToneName): void {
  const now = context.currentTime;
  switch (tone) {
    case 'beep':
      return beep(context, now, 880, 0.15);
    case 'beep-high':
      return beep(context, now, 1320, 0.15);
    case 'beep-low':
      return beep(context, now, 440, 0.25);
    case 'double-beep':
      beep(context, now, 880, 0.1);
      return beep(context, now + 0.18, 880, 0.1);
    case 'whistle':
      return whistle(context, now);
    case 'clap':
      return clap(context, now);
    case 'bell':
      return bell(context, now);
    case 'triple-bell':
      for (let i = 0; i < 3; i++) {
        bell(context, now + i * 0.35);
      }
      return;
  }
}

function envelope(context: AudioContext, start: number, duration: number, peak: number): GainNode {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  gain.connect(context.destination);
  return gain;
}

function beep(context: AudioContext, start: number, frequency: number, duration: number): void {
  const oscillator = context.createOscillator();
  oscillator.type = 'square';
  oscillator.frequency.value = frequency;
  oscillator.connect(envelope(context, start, duration, 0.25));
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function whistle(context: AudioContext, start: number): void {
  const duration = 0.45;
  const oscillator = context.createOscillator();
  oscillator.frequency.value = 2600;
  const trill = context.createOscillator();
  trill.frequency.value = 30;
  const trillDepth = context.createGain();
  trillDepth.gain.value = 120;
  trill.connect(trillDepth).connect(oscillator.frequency);
  oscillator.connect(envelope(context, start, duration, 0.3));
  oscillator.start(start);
  trill.start(start);
  oscillator.stop(start + duration + 0.02);
  trill.stop(start + duration + 0.02);
}

function clap(context: AudioContext, start: number): void {
  const duration = 0.12;
  const noise = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.random() * 2 - 1;
  }
  const source = context.createBufferSource();
  source.buffer = noise;
  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1200;
  filter.Q.value = 0.8;
  source.connect(filter).connect(envelope(context, start, duration, 0.9));
  source.start(start);
}

/** Inharmonic partials with staggered decay give a metallic, boxing-bell-like strike. */
function bell(context: AudioContext, start: number): void {
  const fundamental = 780;
  const partials = [
    { ratio: 1, level: 0.35, decay: 1.2 },
    { ratio: 2.76, level: 0.18, decay: 0.8 },
    { ratio: 5.4, level: 0.08, decay: 0.5 },
  ];
  for (const partial of partials) {
    const oscillator = context.createOscillator();
    oscillator.frequency.value = fundamental * partial.ratio;
    oscillator.connect(envelope(context, start, partial.decay, partial.level));
    oscillator.start(start);
    oscillator.stop(start + partial.decay + 0.02);
  }
}
