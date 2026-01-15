/**
 * Sound Settings Store
 * Manages UI sound preferences with localStorage persistence
 */

import { playToggle, playSuccess, playCopy, playDownload, playPreset } from './ui-sounds'

const STORAGE_KEY = 'rocktune-sounds-enabled'

function loadSetting(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

function saveSetting(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, String(enabled))
}

class SoundSettings {
  enabled = $state(loadSetting())

  toggle(): void {
    this.enabled = !this.enabled
    saveSetting(this.enabled)
    // Play a sound to confirm the toggle (always play this one)
    playToggle(this.enabled)
  }

  /** Play toggle sound if enabled */
  onToggle(isEnabled: boolean): void {
    if (this.enabled) playToggle(isEnabled)
  }

  /** Play success sound if enabled */
  onSuccess(): void {
    if (this.enabled) playSuccess()
  }

  /** Play copy sound if enabled */
  onCopy(): void {
    if (this.enabled) playCopy()
  }

  /** Play download sound if enabled */
  onDownload(): void {
    if (this.enabled) playDownload()
  }

  /** Play preset selected sound if enabled */
  onPreset(): void {
    if (this.enabled) playPreset()
  }
}

export const soundSettings = new SoundSettings()
