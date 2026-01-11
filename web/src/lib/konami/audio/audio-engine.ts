/**
 * Web Audio Engine
 * Manages AudioContext and provides utilities for sound synthesis
 */

let audioContext: AudioContext | null = null;
let masterVolume = 0.3;

/**
 * Get or create AudioContext
 */
export function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }

  // Resume if suspended (browser autoplay policy)
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }

  return audioContext;
}

/**
 * Set master volume (0-1)
 */
export function setMasterVolume(volume: number): void {
  masterVolume = Math.max(0, Math.min(1, volume));
}

/**
 * Get current master volume
 */
export function getMasterVolume(): number {
  return masterVolume;
}

/**
 * Play a simple tone
 */
export function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "square",
  volume = 1.0,
): void {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;

  const finalVolume = volume * masterVolume;
  gain.gain.setValueAtTime(finalVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

/**
 * Play a frequency sweep (pitch bend)
 */
export function playFrequencySweep(
  startFreq: number,
  endFreq: number,
  duration: number,
  type: OscillatorType = "sawtooth",
  volume = 1.0,
): void {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(
    endFreq,
    ctx.currentTime + duration,
  );

  const finalVolume = volume * masterVolume;
  gain.gain.setValueAtTime(finalVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

/**
 * Play white noise (for explosion effects)
 */
export function playNoise(
  duration: number,
  filterFreqStart: number,
  filterFreqEnd: number,
  volume = 1.0,
): void {
  const ctx = getAudioContext();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Generate white noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(filterFreqStart, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(
    filterFreqEnd,
    ctx.currentTime + duration,
  );

  const gain = ctx.createGain();
  const finalVolume = volume * masterVolume;
  gain.gain.setValueAtTime(finalVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(ctx.currentTime);
  noise.stop(ctx.currentTime + duration);
}

/**
 * Play a sequence of notes
 */
export function playNoteSequence(
  notes: { frequency: number; duration: number }[],
  type: OscillatorType = "square",
  volume = 1.0,
): void {
  const ctx = getAudioContext();
  let currentTime = ctx.currentTime;

  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = note.frequency;

    const finalVolume = volume * masterVolume;
    gain.gain.setValueAtTime(finalVolume, currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, currentTime + note.duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(currentTime);
    osc.stop(currentTime + note.duration);

    currentTime += note.duration;
  }
}
