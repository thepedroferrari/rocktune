<script lang="ts">
/**
 * CRT Monitor Effect Overlay
 * Applies retro CRT visual effects: scanlines, chromatic aberration, screen curvature, vignette
 */

import '../../styles/konami/crt-effects.css'

interface Props {
  children: import('svelte').Snippet
}

let { children }: Props = $props()
</script>

<div class="crt-overlay">
	<div class="crt-container">
		<div class="crt-content">
			{@render children()}
		</div>
		<div class="crt-scanlines" aria-hidden="true"></div>
		<div class="crt-chromatic" aria-hidden="true"></div>
		<div class="crt-vignette" aria-hidden="true"></div>
		<div class="crt-noise" aria-hidden="true"></div>
	</div>
</div>
