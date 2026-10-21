<script lang="ts">
/**
 * HeroSection - name, one line, one button.
 */

import { scrollToSection } from '$lib/scroll'
</script>

<header class="hero">
  <h1 class="hero-logo">RockTune</h1>
  <p class="hero-lede">
    One PowerShell script built for your CPU, GPU and games. Read every line before you run it.
  </p>
  <a
    href="#clean-first"
    class="cyber-btn cyber-btn--primary"
    onclick={(event) => {
      event.preventDefault()
      scrollToSection({ sectionId: 'clean-first' })
    }}
  >
    Build my script
  </a>
</header>

<style>
.hero {
  max-inline-size: var(--max-width);
  margin-inline: auto;
  padding: var(--space-3xl) var(--space-md) var(--space-2xl);
}

.hero-logo {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--cyber-yellow);
  margin: 0 0 var(--space-sm);
}

.hero-lede {
  max-inline-size: 60ch;
  font-size: var(--text-lg);
  color: var(--text-secondary);
  margin: 0 0 var(--space-lg);
}
</style>
