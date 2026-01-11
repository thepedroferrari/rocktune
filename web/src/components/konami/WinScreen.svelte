<script lang="ts">
  /**
   * Win Screen
   * Victory modal with FF victory fanfare
   */

  import { onMount } from "svelte";
  import { playVictoryFanfare } from "$lib/konami/audio/ff-fanfare";
  import {
    updateHighScore,
    getKonamiState,
  } from "$lib/konami/konami-state.svelte";

  interface Props {
    score: number;
    onexit?: () => void;
  }

  let { score, onexit }: Props = $props();

  const konamiState = getKonamiState();
  const isNewHighScore = $derived(score > konamiState.highScore);

  onMount(() => {
    // Play victory fanfare
    playVictoryFanfare();

    // Update high score
    updateHighScore(score);
  });
</script>

<div class="win-screen">
  <div class="win-modal">
    <h1 class="win-title">BLOATWARE ELIMINATED!</h1>

    <div class="win-stats">
      <div class="stat">
        <div class="stat-label">Total FPS Gained</div>
        <div class="stat-value">+{score}</div>
      </div>

      {#if isNewHighScore}
        <div class="stat highlight">
          <div class="stat-label">🏆 NEW HIGH SCORE! 🏆</div>
        </div>
      {:else}
        <div class="stat">
          <div class="stat-label">High Score</div>
          <div class="stat-value">+{konamiState.highScore}</div>
        </div>
      {/if}
    </div>

    <button class="exit-button" onclick={onexit}>Exit</button>
  </div>
</div>

<style>
  .win-screen {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: oklch(0 0 0 / 0.9);
    z-index: 10;
  }

  .win-modal {
    padding: var(--space-3xl);
    background: var(--bg-primary);
    border: 2px solid var(--safe);
    border-radius: 8px;
    box-shadow:
      0 0 40px var(--safe),
      inset 0 0 20px oklch(0.75 0.15 175 / 0.1);
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

  .win-title {
    font-family: var(--font-mono);
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 900;
    color: var(--safe);
    text-shadow:
      0 0 20px var(--safe),
      0 0 40px var(--safe);
    margin-block-end: var(--space-xl);
    animation: pulse 1s ease-in-out infinite alternate;
  }

  @keyframes pulse {
    from {
      text-shadow:
        0 0 20px var(--safe),
        0 0 40px var(--safe);
    }
    to {
      text-shadow:
        0 0 30px var(--safe),
        0 0 60px var(--safe),
        0 0 90px var(--safe);
    }
  }

  .win-stats {
    margin-block-end: var(--space-2xl);
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    align-items: center;
  }

  .stat {
    font-family: var(--font-mono);
    text-align: center;
  }

  .stat-label {
    font-size: 1rem;
    color: var(--text-secondary);
    margin-block-end: var(--space-xs);
  }

  .stat-value {
    display: inline;
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--neon-yellow);
    text-shadow: 0 0 20px var(--neon-yellow);
  }

  .stat.highlight {
    animation: rainbow 2s linear infinite;
  }

  @keyframes rainbow {
    0% {
      filter: hue-rotate(0deg);
    }
    100% {
      filter: hue-rotate(360deg);
    }
  }

  .exit-button {
    padding: var(--space-md) var(--space-2xl);
    font-family: var(--font-mono);
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--bg-primary);
    background: var(--safe);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    box-shadow: 0 0 20px var(--safe);
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .exit-button:hover {
    transform: scale(1.05);
    box-shadow: 0 0 40px var(--safe);
  }
</style>
