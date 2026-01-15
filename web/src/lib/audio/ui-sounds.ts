/**
 * UI Sound Effects - Full Throttle Edition
 * Punchy, industrial, biker-gang impact sounds
 * Inspired by LucasArts' Full Throttle (1995)
 */

let audioContext: AudioContext | null = null

function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume()
  }
  return audioContext
}

/** Create noise buffer for metallic textures */
function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const samples = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, samples, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < samples; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

/**
 * Toggle sound - mechanical click/clunk
 * Like flipping a heavy industrial switch
 */
export function playToggle(enabled: boolean): void {
  const ctx = getContext()
  const now = ctx.currentTime

  // Heavy kick body
  const kick = ctx.createOscillator()
  kick.type = 'sine'
  kick.frequency.setValueAtTime(enabled ? 150 : 80, now)
  kick.frequency.exponentialRampToValueAtTime(30, now + 0.08)

  const kickGain = ctx.createGain()
  kickGain.gain.setValueAtTime(0.4, now)
  kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)

  // Metallic click layer
  const click = ctx.createOscillator()
  click.type = 'square'
  click.frequency.setValueAtTime(enabled ? 2000 : 1200, now)
  click.frequency.exponentialRampToValueAtTime(200, now + 0.02)

  const clickGain = ctx.createGain()
  clickGain.gain.setValueAtTime(0.15, now)
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03)

  kick.connect(kickGain).connect(ctx.destination)
  click.connect(clickGain).connect(ctx.destination)

  kick.start(now)
  click.start(now)
  kick.stop(now + 0.1)
  click.stop(now + 0.03)
}

/**
 * Success sound - PA-BAM! Heavy impact
 * Like defeating a rider and grabbing their weapon
 */
export function playSuccess(): void {
  const ctx = getContext()
  const now = ctx.currentTime

  // THUMP - heavy low-end impact
  const thump = ctx.createOscillator()
  thump.type = 'sine'
  thump.frequency.setValueAtTime(100, now)
  thump.frequency.exponentialRampToValueAtTime(25, now + 0.15)

  const thumpGain = ctx.createGain()
  thumpGain.gain.setValueAtTime(0.5, now)
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

  // CRACK - high metallic transient
  const crack = ctx.createOscillator()
  crack.type = 'sawtooth'
  crack.frequency.setValueAtTime(800, now)
  crack.frequency.exponentialRampToValueAtTime(100, now + 0.05)

  const crackGain = ctx.createGain()
  crackGain.gain.setValueAtTime(0.25, now)
  crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

  // Noise burst for that gritty texture
  const noise = ctx.createBufferSource()
  noise.buffer = createNoiseBuffer(ctx, 0.08)

  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'bandpass'
  noiseFilter.frequency.value = 1000
  noiseFilter.Q.value = 1

  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.2, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)

  thump.connect(thumpGain).connect(ctx.destination)
  crack.connect(crackGain).connect(ctx.destination)
  noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination)

  thump.start(now)
  crack.start(now)
  noise.start(now)
  thump.stop(now + 0.2)
  crack.stop(now + 0.08)
  noise.stop(now + 0.08)
}

/**
 * Copy sound - quick metallic snap
 * Like a chain link clicking into place
 */
export function playCopy(): void {
  const ctx = getContext()
  const now = ctx.currentTime

  // Sharp metallic ping
  const ping = ctx.createOscillator()
  ping.type = 'triangle'
  ping.frequency.setValueAtTime(3000, now)
  ping.frequency.exponentialRampToValueAtTime(800, now + 0.03)

  const pingGain = ctx.createGain()
  pingGain.gain.setValueAtTime(0.2, now)
  pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

  // Tiny noise snap
  const noise = ctx.createBufferSource()
  noise.buffer = createNoiseBuffer(ctx, 0.02)

  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'highpass'
  noiseFilter.frequency.value = 5000

  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.1, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015)

  ping.connect(pingGain).connect(ctx.destination)
  noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination)

  ping.start(now)
  noise.start(now)
  ping.stop(now + 0.05)
  noise.stop(now + 0.02)
}

/**
 * Download/forge sound - engine revving up
 * Like Ben's bike roaring to life
 */
export function playDownload(): void {
  const ctx = getContext()
  const now = ctx.currentTime

  // Engine rumble base
  const engine = ctx.createOscillator()
  engine.type = 'sawtooth'
  engine.frequency.setValueAtTime(40, now)
  engine.frequency.exponentialRampToValueAtTime(120, now + 0.3)

  // Harmonic layer
  const harmonic = ctx.createOscillator()
  harmonic.type = 'square'
  harmonic.frequency.setValueAtTime(80, now)
  harmonic.frequency.exponentialRampToValueAtTime(240, now + 0.3)

  // Distortion for that gritty engine sound
  const distortion = ctx.createWaveShaper()
  const samples = 44100
  const buffer = new ArrayBuffer(samples * Float32Array.BYTES_PER_ELEMENT)
  const curve = new Float32Array(buffer)
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1
    curve[i] = Math.tanh(x * 3) // Soft clipping
  }
  distortion.curve = curve

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(400, now)
  filter.frequency.exponentialRampToValueAtTime(2000, now + 0.25)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.15, now + 0.05)
  gain.gain.setValueAtTime(0.15, now + 0.25)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

  engine.connect(distortion)
  harmonic.connect(distortion)
  distortion.connect(filter).connect(gain).connect(ctx.destination)

  engine.start(now)
  harmonic.start(now)
  engine.stop(now + 0.4)
  harmonic.stop(now + 0.4)
}

/**
 * Preset selected - triple punch combo
 * BAM-BAM-BOOM! Like a fight sequence
 */
export function playPreset(): void {
  const ctx = getContext()
  const now = ctx.currentTime

  // Three punchy hits with increasing intensity
  const hits = [
    { time: 0, freq: 120, gain: 0.25 },
    { time: 0.1, freq: 100, gain: 0.3 },
    { time: 0.2, freq: 80, gain: 0.4 }, // Final hit is heaviest
  ]

  for (const hit of hits) {
    const startTime = now + hit.time

    // Impact body
    const impact = ctx.createOscillator()
    impact.type = 'sine'
    impact.frequency.setValueAtTime(hit.freq, startTime)
    impact.frequency.exponentialRampToValueAtTime(30, startTime + 0.1)

    const impactGain = ctx.createGain()
    impactGain.gain.setValueAtTime(hit.gain, startTime)
    impactGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12)

    // Punch transient
    const punch = ctx.createOscillator()
    punch.type = 'sawtooth'
    punch.frequency.setValueAtTime(400 + hit.freq * 3, startTime)
    punch.frequency.exponentialRampToValueAtTime(80, startTime + 0.03)

    const punchGain = ctx.createGain()
    punchGain.gain.setValueAtTime(hit.gain * 0.5, startTime)
    punchGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05)

    // Noise crack
    const noise = ctx.createBufferSource()
    noise.buffer = createNoiseBuffer(ctx, 0.04)

    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 2000
    noiseFilter.Q.value = 2

    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(hit.gain * 0.4, startTime)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.03)

    impact.connect(impactGain).connect(ctx.destination)
    punch.connect(punchGain).connect(ctx.destination)
    noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination)

    impact.start(startTime)
    punch.start(startTime)
    noise.start(startTime)
    impact.stop(startTime + 0.12)
    punch.stop(startTime + 0.05)
    noise.stop(startTime + 0.04)
  }
}
