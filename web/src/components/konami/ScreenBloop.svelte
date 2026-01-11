<script lang="ts">
/**
 * Screen Bloop Animation
 * CRT monitor turn-on effect - expands from center dot like an old TV
 */

import { onMount } from 'svelte'
import '../../styles/konami/konami-animations.css'

interface Props {
	oncomplete?: () => void
}

let { oncomplete }: Props = $props()

const ANIMATION_DURATION_MS = 1200

onMount(() => {
	// Wait for animation to complete, then call oncomplete
	const timer = setTimeout(() => {
		oncomplete?.()
	}, ANIMATION_DURATION_MS)

	return () => {
		clearTimeout(timer)
	}
})
</script>

<div class="screen-bloop"></div>
