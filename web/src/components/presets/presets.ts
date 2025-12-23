import { store } from '../../state'
import type { PresetType } from '../../types'
import { $$ } from '../../utils/dom'
import { updateSoftwareCounter } from '../cards'
import { updateSummary } from '../summary/'

interface PresetConfig {
  opts: string[]
  software: string[]
}

const PRESETS: Record<PresetType, PresetConfig> = {
  competitive: {
    opts: [
      'pagefile', 'fastboot', 'timer', 'power_plan', 'usb_power', 'pcie_power',
      'dns', 'nagle', 'audio_enhancements', 'gamedvr', 'background_apps',
      'edge_debloat', 'copilot_disable', 'explorer_speed', 'temp_purge', 'razer_block',
      'msi_mode', 'game_bar', 'fso_disable', 'ultimate_perf', 'services_trim', 'disk_cleanup',
      'privacy_tier2', 'ipv4_prefer', 'teredo_disable',
    ],
    software: ['steam', 'discord'],
  },
  streaming: {
    opts: [
      'pagefile', 'fastboot', 'timer', 'power_plan', 'usb_power', 'pcie_power',
      'dns', 'audio_enhancements', 'gamedvr', 'background_apps', 'edge_debloat',
      'copilot_disable', 'explorer_speed', 'temp_purge', 'razer_block',
      'fso_disable', 'ultimate_perf', 'services_trim', 'disk_cleanup', 'privacy_tier1',
    ],
    software: ['steam', 'discord', 'obs', 'vlc', '7zip'],
  },
  balanced: {
    opts: [
      'pagefile', 'fastboot', 'timer', 'power_plan', 'usb_power', 'pcie_power',
      'dns', 'nagle', 'audio_enhancements', 'gamedvr', 'background_apps',
      'edge_debloat', 'copilot_disable', 'explorer_speed', 'temp_purge', 'razer_block',
      'disk_cleanup', 'privacy_tier1',
    ],
    software: ['steam', 'discord', 'vlc', '7zip'],
  },
  minimal: {
    opts: ['dns', 'gamedvr', 'background_apps', 'edge_debloat', 'copilot_disable', 'temp_purge', 'razer_block'],
    software: ['steam', '7zip'],
  },
}

const PRESET_LABELS: Record<PresetType, string> = {
  competitive: 'Competitive',
  streaming: 'Streaming',
  balanced: 'Balanced',
  minimal: 'Minimal',
}

let currentPreset: PresetType | null = null

function updatePresetBadges(presetName: PresetType, opts: string[]): void {
  const optsSet = new Set(opts)
  for (const label of $$<HTMLLabelElement>('label[data-opt]')) {
    const optValue = label.dataset.opt
    const badge = label.querySelector<HTMLSpanElement>('.preset-badge')
    if (!badge || !optValue) continue

    if (optsSet.has(optValue)) {
      badge.textContent = PRESET_LABELS[presetName]
      badge.dataset.preset = presetName
      badge.hidden = false
      badge.classList.remove('faded')
    } else {
      badge.hidden = true
    }
  }
}

function fadePresetBadge(optValue: string): void {
  const badge = document.querySelector<HTMLSpanElement>(`label[data-opt="${optValue}"] .preset-badge`)
  if (badge && !badge.hidden) badge.classList.add('faded')
}

function applyPreset(presetName: PresetType): void {
  const preset = PRESETS[presetName]
  currentPreset = presetName

  for (const cb of $$<HTMLInputElement>('input[name="opt"]')) {
    cb.checked = preset.opts.includes(cb.value)
  }

  updatePresetBadges(presetName, preset.opts)
  store.setSelection(preset.software)

  for (const card of $$('.software-card')) {
    const key = card.dataset.key
    if (!key) continue
    const selected = preset.software.includes(key)
    card.classList.toggle('selected', selected)
    card.setAttribute('aria-checked', String(selected))
    const action = card.querySelector('.back-action')
    if (action) action.textContent = selected ? '✓ Selected' : 'Click to add'
  }

  updateSoftwareCounter()
  updateSummary()
  document.dispatchEvent(new CustomEvent('script-change-request'))
}

export function setupPresets(): void {
  const buttons = $$<HTMLButtonElement>('.preset-btn')

  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      const name = btn.dataset.preset as PresetType | undefined
      if (!name || !PRESETS[name]) return
      for (const b of buttons) b.classList.toggle('active', b === btn)
      applyPreset(name)
    })
  }

  for (const cb of $$<HTMLInputElement>('input[name="opt"]')) {
    cb.addEventListener('change', () => fadePresetBadge(cb.value))
  }
}

export function getCurrentPreset(): PresetType | null {
  return currentPreset
}

export { PRESETS as presets }
