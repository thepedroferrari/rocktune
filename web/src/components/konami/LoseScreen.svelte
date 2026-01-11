<script lang="ts">
/**
 * Lose Screen
 * Game over modal
 */

import { getKonamiState } from '$lib/konami/konami-state.svelte'

interface Props {
	score: number
	onrestart?: () => void
	onexit?: () => void
}

let { score, onrestart, onexit }: Props = $props()

const konamiState = getKonamiState()
</script>

<div class="lose-screen">
	<div class="lose-modal">
		<h1 class="lose-title">BLOATWARE OVERLOAD!</h1>

		<div class="lose-stats">
			<div class="stat">
				<div class="stat-label">FPS Gained</div>
				<div class="stat-value">+{score}</div>
			</div>

			<div class="stat">
				<div class="stat-label">High Score</div>
				<div class="stat-value">+{konamiState.highScore}</div>
			</div>
		</div>

		<div class="lose-buttons">
			<button class="retry-button" onclick={onrestart}>Try Again</button>
			<button class="exit-button" onclick={onexit}>Exit</button>
		</div>
	</div>
</div>

<style>
	.lose-screen {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: oklch(0 0 0 / 0.9);
		z-index: 10;
	}

	.lose-modal {
		padding: var(--space-3xl);
		background: var(--bg-primary);
		border: 2px solid var(--risky);
		border-radius: 8px;
		box-shadow:
			0 0 40px var(--risky),
			inset 0 0 20px oklch(0.72 0.18 10 / 0.1);
		clip-path: polygon(
			0 0,
			calc(100% - 20px) 0,
			100% 20px,
			100% 100%,
			20px 100%,
			0 calc(100% - 20px)
		);
		text-align: center;
	}

	.lose-title {
		font-family: var(--font-mono);
		font-size: clamp(2rem, 5vw, 3rem);
		font-weight: 900;
		color: var(--risky);
		text-shadow:
			0 0 20px var(--risky),
			0 0 40px var(--risky);
		margin-block-end: var(--space-xl);
		animation: flicker 0.5s ease-in-out infinite alternate;
	}

	@keyframes flicker {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.8;
		}
	}

	.lose-stats {
		margin-block-end: var(--space-2xl);
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.stat {
		font-family: var(--font-mono);
	}

	.stat-label {
		font-size: 1rem;
		color: var(--text-secondary);
		margin-block-end: var(--space-xs);
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: var(--neon-magenta);
		text-shadow: 0 0 20px var(--neon-magenta);
	}

	.lose-buttons {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
	}

	.retry-button,
	.exit-button {
		padding: var(--space-md) var(--space-2xl);
		font-family: var(--font-mono);
		font-size: 1.25rem;
		font-weight: 700;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}

	.retry-button {
		color: var(--bg-primary);
		background: var(--neon-yellow);
		box-shadow: 0 0 20px var(--neon-yellow);
	}

	.retry-button:hover {
		transform: scale(1.05);
		box-shadow: 0 0 40px var(--neon-yellow);
	}

	.exit-button {
		color: var(--text-primary);
		background: var(--bg-secondary);
		border: 1px solid var(--text-secondary);
	}

	.exit-button:hover {
		transform: scale(1.05);
		border-color: var(--text-primary);
	}
</style>
