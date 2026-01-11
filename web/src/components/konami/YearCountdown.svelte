<script lang="ts">
/**
 * Year Countdown Animation
 * Counts backwards from current year (2026) to 1978 (Space Invaders release year)
 */

import { onMount } from 'svelte'
import { playBlip, playPowerup } from '$lib/konami/audio/retro-sounds'
import '../../styles/konami/konami-animations.css'

interface Props {
	oncomplete?: () => void
}

let { oncomplete }: Props = $props()

const START_YEAR = 2026
const END_YEAR = 1978
const DURATION_MS = 3000
const TOTAL_YEARS = START_YEAR - END_YEAR
const MS_PER_YEAR = DURATION_MS / TOTAL_YEARS

let currentYear = $state(START_YEAR)
let rotationY = $state(0)

onMount(() => {
	let yearTimer: ReturnType<typeof setInterval> | null = null
	let rotationFrame: number | null = null
	let startTime = Date.now()

	// Year countdown interval
	yearTimer = setInterval(() => {
		const elapsed = Date.now() - startTime
		const yearsElapsed = Math.floor(elapsed / MS_PER_YEAR)
		const newYear = START_YEAR - yearsElapsed

		if (newYear <= END_YEAR) {
			currentYear = END_YEAR
			playBlip(END_YEAR)
			if (yearTimer) clearInterval(yearTimer)

			// Wait 500ms after final year, play powerup, then call oncomplete
			setTimeout(() => {
				playPowerup()
				if (rotationFrame) cancelAnimationFrame(rotationFrame)
				setTimeout(() => {
					oncomplete?.()
				}, 500)
			}, 500)
		} else if (newYear !== currentYear) {
			currentYear = newYear
			playBlip(newYear)
		}
	}, MS_PER_YEAR)

	// 3D rotation animation (smooth)
	const animateRotation = () => {
		const elapsed = Date.now() - startTime
		const progress = Math.min(elapsed / DURATION_MS, 1)

		// Oscillating rotation -15 to +15 degrees
		rotationY = Math.sin(progress * Math.PI * 4) * 15

		if (progress < 1) {
			rotationFrame = requestAnimationFrame(animateRotation)
		}
	}

	rotationFrame = requestAnimationFrame(animateRotation)

	return () => {
		if (yearTimer) clearInterval(yearTimer)
		if (rotationFrame) cancelAnimationFrame(rotationFrame)
	}
})
</script>

<div class="year-countdown">
	<div
		class="year-text"
		style:transform={`perspective(800px) rotateY(${rotationY}deg)`}
	>
		{currentYear}
	</div>
</div>
