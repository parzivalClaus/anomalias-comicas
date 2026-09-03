export type SoundCueType =
  | 'buy'
  | 'eggHatch'
  | 'eggSpawn'
  | 'invalid'
  | 'merge'
  | 'portalTransform';

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (audioContext) return audioContext;

  const AudioContextConstructor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) return null;

  audioContext = new AudioContextConstructor();
  return audioContext;
}

export function unlockGameAudio() {
  const context = getAudioContext();
  if (!context || context.state !== 'suspended') return;

  void context.resume();
}

function envelope(
  context: AudioContext,
  gain: GainNode,
  startTime: number,
  duration: number,
  volume: number,
) {
  gain.gain.cancelScheduledValues(startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + Math.min(0.025, duration * 0.28));
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
}

function tone(
  context: AudioContext,
  frequency: number,
  startOffset: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
  endFrequency?: number,
) {
  const startTime = context.currentTime + startOffset;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  if (endFrequency !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, startTime + duration);
  }

  envelope(context, gain, startTime, duration, volume);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.03);
}

function noiseBurst(context: AudioContext, startOffset: number, duration: number, volume: number) {
  const sampleRate = context.sampleRate;
  const buffer = context.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
  }

  const startTime = context.currentTime + startOffset;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1200, startTime);
  filter.Q.setValueAtTime(0.7, startTime);
  envelope(context, gain, startTime, duration, volume);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(startTime);
  source.stop(startTime + duration + 0.03);
}

export function playSoundCue(type: SoundCueType) {
  const context = getAudioContext();
  if (!context) return;

  if (context.state === 'suspended') {
    void context.resume();
    if (context.state === 'suspended') return;
  }

  switch (type) {
    case 'buy':
      tone(context, 740, 0, 0.08, 0.055, 'triangle');
      tone(context, 1120, 0.055, 0.12, 0.045, 'sine');
      break;

    case 'eggSpawn':
      tone(context, 520, 0, 0.26, 0.045, 'sine', 880);
      tone(context, 1240, 0.08, 0.18, 0.026, 'triangle', 1720);
      break;

    case 'eggHatch':
      noiseBurst(context, 0, 0.16, 0.05);
      tone(context, 260, 0, 0.22, 0.04, 'triangle', 190);
      tone(context, 880, 0.08, 0.22, 0.05, 'sine', 1320);
      tone(context, 1320, 0.18, 0.18, 0.035, 'sine');
      break;

    case 'invalid':
      tone(context, 180, 0, 0.16, 0.04, 'triangle', 130);
      break;

    case 'merge':
      tone(context, 420, 0, 0.14, 0.05, 'triangle');
      tone(context, 630, 0.07, 0.16, 0.044, 'sine');
      tone(context, 940, 0.15, 0.18, 0.034, 'sine');
      break;

    case 'portalTransform':
      tone(context, 120, 0, 0.42, 0.055, 'sawtooth', 78);
      tone(context, 520, 0.04, 0.32, 0.045, 'sine', 980);
      tone(context, 1560, 0.18, 0.26, 0.032, 'triangle', 2100);
      noiseBurst(context, 0.1, 0.22, 0.035);
      break;
  }
}
