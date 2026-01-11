<script lang="ts">
/**
 * Bloatware Blaster - Space Invaders Game
 * Main game component that manages the canvas, game engine, and UI
 */

import { onMount } from 'svelte'
import { GameEngine, type GameStatus } from '$lib/konami/bloatware-blaster/game-engine'
import { InputHandler } from '$lib/konami/bloatware-blaster/input-handler'
import { Renderer } from '$lib/konami/bloatware-blaster/renderer'
import WinScreen from './WinScreen.svelte'
import LoseScreen from './LoseScreen.svelte'
import GameUI from './GameUI.svelte'

interface Props {
	onexit?: () => void
}

let { onexit }: Props = $props()

let canvas: HTMLCanvasElement | null = $state(null)
let score = $state(0)
let lives = $state(3)
let status: GameStatus = $state('playing')

onMount(() => {
	if (!canvas) return

	// Set canvas size
	const maxWidth = Math.min(window.innerWidth * 0.9, 800)
	const maxHeight = Math.min(window.innerHeight * 0.8, 600)
	canvas.width = maxWidth
	canvas.height = maxHeight

	// Initialize game systems
	const renderer = new Renderer(canvas)
	const input = new InputHandler()
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
	// Reload the component by calling onexit and reactivating
	onexit?.()
	setTimeout(() => {
		window.location.reload()
	}, 100)
}
</script>

<div class="bloatware-blaster">
	<canvas bind:this={canvas} class="game-canvas"></canvas>

	{#if status === 'playing'}
		<GameUI {score} {lives} />
	{:else if status === 'won'}
		<WinScreen {score} onexit={onexit} />
	{:else if status === 'lost'}
		<LoseScreen {score} onrestart={handleRestart} onexit={onexit} />
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
		box-shadow: 0 0 20px var(--neon-cyan);
		border-radius: 4px;
	}
</style>
