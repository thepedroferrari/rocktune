<script lang="ts">
/**
 * Game UI - HUD Overlay
 * Displays score, lives, and controls during gameplay
 */

interface Props {
	score: number
	lives: number
}

let { score, lives }: Props = $props()

// Create hearts array based on lives
const hearts = $derived(Array.from({ length: 3 }, (_, i) => i < lives))
</script>

<div class="game-ui">
	<div class="ui-top">
		<div class="score">
			FPS GAINED: <span class="score-value">+{score}</span>
		</div>
		<div class="lives">
			{#each hearts as alive}
				<span class="heart" class:alive>{alive ? '❤️' : '🖤'}</span>
			{/each}
		</div>
	</div>

	<div class="ui-bottom">
		<span class="controls">← → MOVE | SPACE SHOOT</span>
	</div>
</div>

<style>
	.game-ui {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 1;
		padding: var(--space-md);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.ui-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-family: var(--font-mono);
		font-size: 1.25rem;
		color: var(--neon-cyan);
		text-shadow: 0 0 10px var(--neon-cyan);
	}

	.score-value {
		color: var(--neon-yellow);
		text-shadow: 0 0 10px var(--neon-yellow);
		font-weight: 700;
	}

	.lives {
		display: flex;
		gap: var(--space-xs);
	}

	.heart {
		font-size: 1.5rem;
		filter: drop-shadow(0 0 5px currentColor);
	}

	.ui-bottom {
		text-align: center;
		font-family: var(--font-mono);
		font-size: 1rem;
		color: var(--text-secondary);
		opacity: 0.7;
	}
</style>
