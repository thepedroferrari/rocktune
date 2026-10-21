<script lang="ts" module>
import { ANTI_CHEAT_CONFLICTS } from '$lib/optimizations'
import {
  ANTI_CHEAT_LABELS,
  type AntiCheat,
  type AntiCheatConflict,
  type OptimizationKey,
} from '$lib/types'

/** Short names that fit on a card badge */
const SHORT_NAMES: Record<AntiCheat, string> = {
  vanguard: 'Vanguard',
  faceit: 'FACEIT',
  javelin: 'Javelin',
  battleye: 'BattlEye',
  easy_anti_cheat: 'EAC',
  ricochet: 'Ricochet',
}

export function getAntiCheatConflicts(key: OptimizationKey): readonly AntiCheatConflict[] {
  return ANTI_CHEAT_CONFLICTS[key] ?? []
}

/** "Breaks Vanguard", or "Breaks Vanguard +2" when more than one anti-cheat is affected */
export function antiCheatBadgeText(conflicts: readonly AntiCheatConflict[]): string {
  const [first, ...rest] = conflicts
  if (!first) return ''
  const extra = rest.length > 0 ? ` +${rest.length}` : ''
  return `Breaks ${SHORT_NAMES[first.antiCheat]}${extra}`
}

/** One plain sentence per conflict: "Riot Vanguard (Valorant, League of Legends): effect" */
export function antiCheatLines(conflicts: readonly AntiCheatConflict[]): string[] {
  return conflicts.map((conflict) => {
    const label = ANTI_CHEAT_LABELS[conflict.antiCheat]
    return `${label.name} (${label.games}): ${conflict.effect}`
  })
}
</script>

<script lang="ts">
interface Props {
  conflicts: readonly AntiCheatConflict[]
}

const { conflicts }: Props = $props()

const text = $derived(antiCheatBadgeText(conflicts))
const description = $derived(`Anti-cheat conflict. ${antiCheatLines(conflicts).join(' ')}`)
</script>

{#if conflicts.length > 0}
  <span class="ac-badge" role="img" aria-label={description}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
    {text}
  </span>
{/if}

<style>
.ac-badge {
  --ac-badge-color: var(--neon-magenta);
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-inline-start: var(--space-xs);
  padding: 0 5px;
  border: 1px solid var(--ac-badge-color);
  background: color-mix(in oklch, var(--ac-badge-color) 14%, transparent);
  color: var(--ac-badge-color);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: 800;
  line-height: 1.6;
  white-space: nowrap;
  vertical-align: middle;
}

.ac-badge svg {
  inline-size: 1em;
  block-size: 1em;
}
</style>
