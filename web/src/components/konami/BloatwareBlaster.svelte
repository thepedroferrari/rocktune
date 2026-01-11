<script lang="ts">
/**
 * Bloatware Invaders - Space Invaders Game
 * Main game component that manages the canvas, game engine, and UI
 */

import { GameEngine, type GameStatus } from '$lib/konami/bloatware-blaster/game-engine'
import { type GameMode, InputHandler } from '$lib/konami/bloatware-blaster/input-handler'
import { Renderer } from '$lib/konami/bloatware-blaster/renderer'
import GameUI from './GameUI.svelte'
import LoseScreen from './LoseScreen.svelte'
import StartScreen from './StartScreen.svelte'
import WinScreen from './WinScreen.svelte'

interface Props {
  onexit?: () => void
}

let { onexit }: Props = $props()

let canvas: HTMLCanvasElement | null = $state(null)
let mode: GameMode | null = $state(null)
let score = $state(0)
let lives = $state(3)
let status: GameStatus = $state('playing')

$effect(() => {
  // Wait for mode selection and canvas to be ready
  if (mode === null || !canvas) return

  // Set canvas size
  const maxWidth = Math.min(window.innerWidth * 0.9, 800)
  const maxHeight = Math.min(window.innerHeight * 0.8, 600)
  canvas.width = maxWidth
  canvas.height = maxHeight

  // Initialize game systems with selected mode
  const renderer = new Renderer(canvas)
  const input = new InputHandler(mode) // Pass mode for shooting cooldown
  const engine = new GameEngine(canvas, renderer, input)

  // Set up callbacks
  engine.setCallbacks({
    onScoreChange: (newScore) => {
      score = newScore
    },
    onLivesChange: (newLives) => {
      lives = newLives
    },
    onStatusChange: (newStatus) => {
      status = newStatus
    },
  })

  // Start game
  input.start()
  engine.start()

  return () => {
    engine.stop()
    input.stop()
  }
})

function handleRestart() {
  // Reset to mode selection screen (no page reload!)
  mode = null
  score = 0
  lives = 3
  status = 'playing'
}
</script>

<div class="bloatware-blaster">
	{#if mode === null}
		<StartScreen onstart={(selectedMode) => { mode = selectedMode }} />
	{:else}
		<canvas bind:this={canvas} class="game-canvas"></canvas>

		{#if status === 'playing'}
			<GameUI {score} {lives} />
		{:else if status === 'won'}
			<WinScreen {score} onexit={onexit} />
		{:else if status === 'lost'}
			<LoseScreen {score} onrestart={handleRestart} onexit={onexit} />
		{/if}
	{/if}
</div>

<style>
	.bloatware-blaster {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-primary);
	}

	.game-canvas {
		border: 2px solid var(--neon-cyan);
		box-shadow: 0 0 40px var(--neon-cyan); /* Bigger glow for more impact */
		border-radius: 4px;
	}
</style>
