import { store } from '../state'
import { $$ } from '../utils/dom'
import { updateSoftwareCounter } from './cards'
import { updateSummary } from './summary'

export interface Preset {
  opts: string[]
  software: string[]
}

export const presets: Record<string, Preset> = {
  competitive: {
    opts: [
      'pagefile',
      'fastboot',
      'timer',
      'power_plan',
      'usb_power',
      'pcie_power',
      'dns',
      'nagle',
      'audio_enhancements',
      'msi_mode',
      'game_bar',
    ],
    software: ['steam', 'discord'],
  },
  streaming: {
    opts: [
      'pagefile',
      'fastboot',
      'power_plan',
      'usb_power',
      'pcie_power',
      'dns',
      'audio_enhancements',
    ],
    software: ['steam', 'discord', 'obs', 'vlc', '7zip'],
  },
  balanced: {
    opts: [
      'pagefile',
      'fastboot',
      'timer',
      'power_plan',
      'usb_power',
      'pcie_power',
      'dns',
      'nagle',
      'audio_enhancements',
    ],
    software: ['steam', 'discord', 'vlc', '7zip'],
  },
  minimal: {
    opts: ['fastboot', 'power_plan', 'dns'],
    software: ['steam', '7zip'],
  },
}

export function setupPresets(): void {
  const presetButtons = $$('.preset-btn')

  for (const btn of presetButtons) {
    btn.addEventListener('click', () => {
      const presetName = btn.dataset.preset
      if (!presetName) return

      const preset = presets[presetName]
      if (!preset) return

      // Update active state
      for (const b of presetButtons) {
        b.classList.remove('active')
      }
      btn.classList.add('active')

      // Apply opts
      for (const cb of $$<HTMLInputElement>('input[name="opt"]')) {
        cb.checked = preset.opts.includes(cb.value)
      }

      // Apply software selection
      store.setSelection(preset.software)

      // Update UI
      for (const card of $$('.software-card')) {
        const key = card.dataset.key
        if (!key) continue

        const selected = preset.software.includes(key)
        card.classList.toggle('selected', selected)
        card.setAttribute('aria-checked', selected ? 'true' : 'false')

        const action = card.querySelector('.back-action')
        if (action) action.textContent = selected ? '✓ Selected' : 'Click to add'
      }

      updateSoftwareCounter()
      updateSummary()
      document.dispatchEvent(new CustomEvent('script-change-request'))
    })
  }
}
