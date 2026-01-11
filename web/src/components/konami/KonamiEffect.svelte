<script lang="ts">
/**
 * Konami Effect - Main Orchestrator
 * Manages the multi-stage easter egg experience:
 * 1. Year countdown (2026 → 1978)
 * 2. Screen bloop (CRT turn-on)
 * 3. Bloatware Blaster game
 */

import { onMount } from 'svelte'
import CRTEffect from './CRTEffect.svelte'
import YearCountdown from './YearCountdown.svelte'
import ScreenBloop from './ScreenBloop.svelte'
import BloatwareBlaster from './BloatwareBlaster.svelte'
import { playThunk } from '$lib/konami/audio/retro-sounds'

interface Props {
	onexit?: () => void
}

let { onexit }: Props = $props()

type Phase = 'countdown' | 'bloop' | 'game'
let phase: Phase = $state('countdown')

function handleCountdownComplete() {
	phase = 'bloop'
	playThunk() // Play bloop sound immediately
}

function handleBloopComplete() {
	phase = 'game'
}

// Global ESC handler to exit at any time
onMount(() => {
	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			onexit?.()
		}
	}

	window.addEventListener('keydown', handleKeyDown)

	return () => {
		window.removeEventListener('keydown', handleKeyDown)
	}
})
</script>

<CRTEffect>
	{#if phase === 'countdown'}
		<YearCountdown oncomplete={handleCountdownComplete} />
	{:else if phase === 'bloop'}
		<ScreenBloop oncomplete={handleBloopComplete} />
	{:else if phase === 'game'}
		<BloatwareBlaster onexit={onexit} />
	{/if}
</CRTEffect>
