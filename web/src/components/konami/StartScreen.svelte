<script lang="ts">
/**
 * Start Screen - Game Mode Selection
 * Bloatware Invaders - Choose your difficulty!
 */

interface Props {
	onstart?: (mode: "normal" | "rocktunned") => void
}

let { onstart }: Props = $props()

function handleModeSelect(mode: "normal" | "rocktunned") {
	onstart?.(mode)
}
</script>

<div class="start-screen">
	<div class="start-modal">
		<h1 class="game-title">BLOATWARE INVADERS</h1>
		<p class="game-tagline">Micro$oft only wants your private data, fight it!</p>

		<div class="mode-buttons">
			<button class="mode-button normal" onclick={() => handleModeSelect("normal")}>
				<div class="mode-label">NORMAL MODE</div>
			</button>

			<button class="mode-button rocktunned" onclick={() => handleModeSelect("rocktunned")}>
				<div class="mode-label">ROCKTUNNED MODE</div>
			</button>
		</div>

		<div class="start-hint">Press ESC anytime to exit</div>
	</div>
</div>

<style>
	.start-screen {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: oklch(0 0 0 / 0.95);
		z-index: 10;
	}

	.start-modal {
		padding: var(--space-3xl);
		background: var(--bg-primary);
		border: 3px solid var(--neon-cyan);
		border-radius: 8px;
		box-shadow:
			0 0 60px var(--neon-cyan),
			inset 0 0 30px oklch(0.92 0.25 195 / 0.15);
		clip-path: polygon(
			0 0,
			calc(100% - 30px) 0,
			100% 30px,
			100% 100%,
			30px 100%,
			0 calc(100% - 30px)
		);
		text-align: center;
		max-width: 600px;
	}

	.game-title {
		font-family: var(--font-mono);
		font-size: clamp(2.5rem, 6vw, 4rem);
		font-weight: 900;
		color: var(--neon-cyan);
		text-shadow:
			0 0 30px var(--neon-cyan),
			0 0 60px var(--neon-cyan),
			0 0 90px var(--neon-magenta);
		margin-block-end: var(--space-md);
		animation: pulse 2s ease-in-out infinite alternate;
	}

	@keyframes pulse {
		from {
			text-shadow:
				0 0 30px var(--neon-cyan),
				0 0 60px var(--neon-cyan);
		}
		to {
			text-shadow:
				0 0 40px var(--neon-cyan),
				0 0 80px var(--neon-cyan),
				0 0 120px var(--neon-magenta);
		}
	}

	.game-tagline {
		font-family: var(--font-mono);
		font-size: 1.25rem;
		color: var(--neon-yellow);
		text-shadow: 0 0 20px var(--neon-yellow);
		margin-block-end: var(--space-2xl);
	}

	.mode-buttons {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
		margin-block-end: var(--space-xl);
	}

	.mode-button {
		padding: var(--space-lg) var(--space-xl);
		font-family: var(--font-mono);
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}

	.mode-button.normal {
		background: var(--neon-cyan);
		color: var(--bg-primary);
		box-shadow: 0 0 30px var(--neon-cyan);
	}

	.mode-button.normal:hover {
		transform: scale(1.05);
		box-shadow: 0 0 50px var(--neon-cyan);
	}

	.mode-button.rocktunned {
		background: var(--neon-yellow);
		color: var(--bg-primary);
		box-shadow: 0 0 30px var(--neon-yellow);
	}

	.mode-button.rocktunned:hover {
		transform: scale(1.05);
		box-shadow: 0 0 50px var(--neon-yellow);
	}

	.mode-label {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.start-hint {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		color: var(--text-secondary);
	}
</style>
