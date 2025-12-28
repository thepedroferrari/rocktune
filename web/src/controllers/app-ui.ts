import { diffLines } from 'diff'
import { buildScript, type SelectionState } from '$lib/script-generator'
import {
  app,
  clearRecommendedPackages,
  setActivePreset,
  setCpu,
  setFilter,
  setGpu,
  setOptimizationCount,
  setSelection,
} from '$lib/state.svelte'
import type { PresetType } from '$lib/types'
import {
  CPU_TYPES,
  FILTER_ALL,
  GPU_TYPES,
  type HardwareProfile,
  isCpuType,
  isGpuType,
  isMonitorSoftwareType,
  isPeripheralType,
  type MonitorSoftwareType,
  type PackageKey,
  type PeripheralType,
  PROFILE_VERSION,
  SCRIPT_FILENAME,
} from '$lib/types'
import { setupRichTooltips } from '../utils/tooltips'

type ScriptMode = 'current' | 'diff' | 'edit'

type CodeViewer = {
  update: (script: string, previous: string) => void
  setMode: (mode: ScriptMode) => void
}

const PERIPHERAL_PACKAGE_MAP: Record<string, string> = {
  logitech: 'logitechghub',
  razer: 'razersynapse',
  corsair: 'icue',
  steelseries: 'steelseriesgg',
  wooting: 'wooting',
}

const _SAFE_PRESET_ID: PresetType = 'gamer'

export function initAppUi(): void {
  setupRichTooltips()

  const syncHardwareCards = setupHardwareCards()
  const scriptState = setupScriptControls()

  // Initialize hardware and optimization state from DOM
  const cpuValue = getCheckedValue('cpu', CPU_TYPES.AMD_X3D)
  const gpuValue = getCheckedValue('gpu', GPU_TYPES.NVIDIA)
  if (isCpuType(cpuValue)) setCpu(cpuValue)
  if (isGpuType(gpuValue)) setGpu(gpuValue)
  setOptimizationCount(
    document.querySelectorAll<HTMLInputElement>('input[name="opt"]:checked').length,
  )

  scriptState.refresh()

  window.addEventListener('software-selection-changed', () => {
    scriptState.refresh()
  })

  document.addEventListener('change', (event) => {
    const target = event.target
    if (!(target instanceof HTMLInputElement)) return

    if (target.name === 'cpu') {
      if (isCpuType(target.value)) setCpu(target.value)
      syncHardwareCards()
      scriptState.refresh()
      return
    }

    if (target.name === 'gpu') {
      if (isGpuType(target.value)) setGpu(target.value)
      syncHardwareCards()
      scriptState.refresh()
      return
    }

    if (target.name === 'opt') {
      // Update optimization count in centralized state
      const count = document.querySelectorAll<HTMLInputElement>('input[name="opt"]:checked').length
      setOptimizationCount(count)
      scriptState.refresh()
      return
    }

    if (target.name === 'peripheral' || target.name === 'monitor-software') {
      scriptState.refresh()
    }
  })

  setupQuickActions(scriptState)
  setupProfileActions(scriptState)
}

function setupHardwareCards(): () => void {
  const driverCards = Array.from(document.querySelectorAll<HTMLElement>('.driver-card'))
  const preflightCards = Array.from(document.querySelectorAll<HTMLElement>('.preflight-card'))

  const sync = () => {
    const hardware = collectHardwareProfile()

    driverCards.forEach((card) => {
      const cpuList = splitDataList(card.dataset.cpu)
      const gpuList = splitDataList(card.dataset.gpu)
      const isAlwaysVisible = card.classList.contains('driver-card--mobo')

      const matchesCpu = cpuList.length > 0 && cpuList.includes(hardware.cpu)
      const matchesGpu = gpuList.length > 0 && gpuList.includes(hardware.gpu)
      const shouldShow = isAlwaysVisible || matchesCpu || matchesGpu

      card.toggleAttribute('hidden', !shouldShow)
      card.classList.toggle('active', shouldShow)
    })

    preflightCards.forEach((card) => {
      const prereq = card.dataset.prereq
      let show = true

      if (prereq === 'amd_x3d') {
        show = hardware.cpu === 'amd_x3d'
      } else if (prereq === 'nvidia') {
        show = hardware.gpu === 'nvidia'
      } else if (prereq === 'amd_gpu') {
        show = hardware.gpu === 'amd'
      }

      card.style.display = show ? '' : 'none'
    })
  }

  sync()
  return sync
}

function setupQuickActions(scriptState: ScriptState): void {
  const previewHero = document.getElementById('preview-btn-hero') as HTMLButtonElement | null
  const previewBtn = document.getElementById('preview-btn') as HTMLButtonElement | null
  const forgeBtn = document.getElementById('download-btn') as HTMLButtonElement | null
  const safeBtn = document.getElementById('quick-download-btn') as HTMLButtonElement | null

  previewHero?.addEventListener('click', () => {
    scriptState.refresh()
    scriptState.openPreview()
  })

  previewBtn?.addEventListener('click', () => {
    scriptState.refresh()
    scriptState.openPreview()
  })

  forgeBtn?.addEventListener('click', () => {
    scriptState.refresh()
    scriptState.download()
  })

  safeBtn?.addEventListener('click', () => {
    applySafeMode()
    scriptState.refresh()
    scriptState.download()
  })
}

function setupProfileActions(scriptState: ScriptState): void {
  const saveBtn = document.getElementById('save-profile-btn') as HTMLButtonElement | null
  const loadInput = document.getElementById('load-profile-input') as HTMLInputElement | null

  saveBtn?.addEventListener('click', () => {
    const profile = buildProfile()
    downloadText(JSON.stringify(profile, null, 2), `rocktune-profile-${Date.now()}.json`)
  })

  loadInput?.addEventListener('change', async () => {
    const file = loadInput.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const profile = JSON.parse(text) as SavedProfile
      applyProfile(profile)
      scriptState.refresh()
    } catch (error) {
      console.error('[RockTune] Failed to load profile:', error)
    } finally {
      loadInput.value = ''
    }
  })
}

type ScriptState = {
  refresh: () => void
  openPreview: () => void
  download: () => void
}

function setupScriptControls(): ScriptState {
  const previewModal = document.getElementById('preview-modal') as HTMLDialogElement | null
  const previewViewerRoot = document.getElementById('preview-viewer') as HTMLElement | null
  const auditViewerRoot = document.getElementById('audit-viewer') as HTMLElement | null
  const previewLines = document.getElementById('preview-lines') as HTMLElement | null
  const previewSize = document.getElementById('preview-size') as HTMLElement | null
  const auditLines = document.getElementById('audit-lines') as HTMLElement | null
  const auditSize = document.getElementById('audit-size') as HTMLElement | null
  const previewCopy = document.getElementById('copy-script') as HTMLButtonElement | null
  const auditCopy = document.getElementById('audit-copy') as HTMLButtonElement | null
  const previewDownload = document.getElementById('download-from-modal') as HTMLButtonElement | null
  const closeModal = document.getElementById('close-modal') as HTMLButtonElement | null
  const auditPanel = document.getElementById('audit-panel') as HTMLElement | null
  const auditToggle = document.getElementById('audit-toggle') as HTMLButtonElement | null

  let generatedScript = ''
  let previousScript = ''
  let editedScript: string | null = null

  const previewViewer = previewViewerRoot
    ? createCodeViewer(previewViewerRoot, {
        linesEl: previewLines,
        sizeEl: previewSize,
        onEdit: (value) => setEditedScript(value),
      })
    : null

  const auditViewer = auditViewerRoot
    ? createCodeViewer(auditViewerRoot, {
        linesEl: auditLines,
        sizeEl: auditSize,
        onEdit: (value) => setEditedScript(value),
      })
    : null

  function setGeneratedScript(next: string): void {
    if (next === generatedScript) return
    previousScript = generatedScript || next
    generatedScript = next
    editedScript = null
    updateViewers()
  }

  function setEditedScript(next: string): void {
    editedScript = next
    updateViewers()
  }

  function getActiveScript(): string {
    return editedScript ?? generatedScript
  }

  function updateViewers(): void {
    const active = getActiveScript()
    previewViewer?.update(active, previousScript)
    auditViewer?.update(active, previousScript)

    if (active.trim().length > 0) {
      auditPanel?.classList.add('visible')
    }
  }

  function refresh(): void {
    const selection = collectSelectionState()
    setGeneratedScript(buildScript(selection, { catalog: app.software }))
  }

  function openPreview(): void {
    if (!previewModal) return
    if (typeof previewModal.showModal === 'function') {
      previewModal.showModal()
    } else {
      previewModal.setAttribute('open', 'true')
    }
    previewViewer?.setMode('current')
  }

  function closePreview(): void {
    if (!previewModal) return
    if (typeof previewModal.close === 'function') {
      previewModal.close()
    } else {
      previewModal.removeAttribute('open')
    }
  }

  function download(): void {
    const script = getActiveScript()
    if (!script.trim()) return
    downloadText(script, SCRIPT_FILENAME)
  }

  previewCopy?.addEventListener('click', () => {
    void copyToClipboard(getActiveScript())
  })

  auditCopy?.addEventListener('click', () => {
    void copyToClipboard(getActiveScript())
  })

  previewDownload?.addEventListener('click', () => {
    download()
  })

  closeModal?.addEventListener('click', closePreview)
  previewModal?.addEventListener('cancel', (event) => {
    event.preventDefault()
    closePreview()
  })

  previewModal?.addEventListener('click', (event) => {
    if (event.target === previewModal) {
      closePreview()
    }
  })

  if (auditToggle && auditPanel) {
    auditToggle.addEventListener('click', () => {
      auditPanel.classList.toggle('open')
      auditPanel.classList.add('visible')
    })
  }

  const preflightCopy = document.querySelector<HTMLButtonElement>(
    '.preflight-card[data-prereq="always"] .prereq-link',
  )

  preflightCopy?.addEventListener('click', () => {
    void copyToClipboard('Checkpoint-Computer -Description "Before RockTune"')
  })

  return {
    refresh,
    openPreview,
    download,
  }
}

type CodeViewerOptions = {
  linesEl: HTMLElement | null
  sizeEl: HTMLElement | null
  onEdit?: (value: string) => void
}

function createCodeViewer(root: HTMLElement, options: CodeViewerOptions): CodeViewer {
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('.cv-tab'))
  const panes = {
    current: root.querySelector<HTMLElement>('[data-pane="current"]'),
    diff: root.querySelector<HTMLElement>('[data-pane="diff"]'),
    edit: root.querySelector<HTMLTextAreaElement>('[data-pane="edit"]'),
  }
  const nav = {
    container: root.querySelector<HTMLElement>('.cv-nav'),
    count: root.querySelector<HTMLElement>('.cv-nav-count'),
    prev: root.querySelector<HTMLButtonElement>('.cv-nav-btn[data-dir="prev"]'),
    next: root.querySelector<HTMLButtonElement>('.cv-nav-btn[data-dir="next"]'),
  }

  let activeMode: ScriptMode = 'current'
  let diffTargets: HTMLElement[] = []
  let diffIndex = 0
  let isEditing = false
  let suppressEdit = false

  function setMode(mode: ScriptMode): void {
    activeMode = mode
    tabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.mode === mode)
    })

    panes.current?.classList.toggle('active', mode === 'current')
    panes.diff?.classList.toggle('active', mode === 'diff')
    panes.edit?.classList.toggle('active', mode === 'edit')

    if (nav.container) {
      nav.container.hidden = mode !== 'diff' || diffTargets.length === 0
    }
  }

  function updateStats(script: string): void {
    const lineCount = script ? script.split('\n').length : 0
    const sizeKb = script ? (new Blob([script]).size / 1024).toFixed(1) : '0.0'

    if (options.linesEl) {
      options.linesEl.textContent = `${lineCount} lines`
    }
    if (options.sizeEl) {
      options.sizeEl.textContent = `${sizeKb} KB`
    }
  }

  function updateDiff(previous: string, current: string): void {
    if (!panes.diff) return

    panes.diff.innerHTML = ''
    diffTargets = []
    diffIndex = 0

    const fragment = document.createDocumentFragment()
    let oldLine = 1
    let newLine = 1

    diffLines(previous || '', current || '').forEach((part) => {
      const lines = part.value.split('\n')
      if (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop()
      }

      lines.forEach((line) => {
        const row = document.createElement('div')
        row.classList.add('cv-line')

        const oldCell = document.createElement('span')
        oldCell.classList.add('cv-ln')

        const newCell = document.createElement('span')
        newCell.classList.add('cv-ln')

        const code = document.createElement('span')
        code.classList.add('cv-code')
        code.textContent = line

        if (part.added) {
          row.classList.add('diff-added')
          newCell.textContent = `${newLine}`
          newLine += 1
          diffTargets.push(row)
        } else if (part.removed) {
          row.classList.add('diff-removed')
          oldCell.textContent = `${oldLine}`
          oldLine += 1
          diffTargets.push(row)
        } else {
          row.classList.add('diff-unchanged')
          oldCell.textContent = `${oldLine}`
          newCell.textContent = `${newLine}`
          oldLine += 1
          newLine += 1
        }

        row.append(oldCell, newCell, code)
        fragment.appendChild(row)
      })
    })

    panes.diff.appendChild(fragment)
    updateNav()
  }

  function updateNav(): void {
    if (!nav.count || !nav.container) return
    const total = diffTargets.length
    if (total === 0) {
      nav.count.textContent = '0/0'
      nav.container.hidden = true
      return
    }
    nav.container.hidden = activeMode !== 'diff'
    nav.count.textContent = `${diffIndex + 1}/${total}`
    focusDiff(diffIndex)
  }

  function focusDiff(index: number): void {
    diffTargets.forEach((target) => {
      target.classList.remove('diff-focus')
    })
    const target = diffTargets[index]
    if (!target) return
    target.classList.add('diff-focus')
    target.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  function update(script: string, previous: string): void {
    if (panes.current) panes.current.textContent = script
    if (panes.edit && !isEditing) {
      suppressEdit = true
      panes.edit.value = script
      suppressEdit = false
    }
    updateDiff(previous, script)
    updateStats(script)
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode as ScriptMode
      if (mode) setMode(mode)
    })
  })

  panes.edit?.addEventListener('focus', () => {
    isEditing = true
  })

  panes.edit?.addEventListener('blur', () => {
    isEditing = false
  })

  panes.edit?.addEventListener('input', () => {
    if (suppressEdit) return
    options.onEdit?.(panes.edit?.value ?? '')
  })

  nav.prev?.addEventListener('click', () => {
    if (diffTargets.length === 0) return
    diffIndex = (diffIndex - 1 + diffTargets.length) % diffTargets.length
    updateNav()
  })

  nav.next?.addEventListener('click', () => {
    if (diffTargets.length === 0) return
    diffIndex = (diffIndex + 1) % diffTargets.length
    updateNav()
  })

  setMode('current')

  return {
    update,
    setMode,
  }
}

function collectSelectionState(): SelectionState {
  const hardware = collectHardwareProfile()
  const optimizations = collectCheckedValues('opt')
  const { packages, missing } = collectSelectedPackages()

  return {
    hardware,
    optimizations,
    packages,
    missingPackages: missing,
  }
}

function collectHardwareProfile(): HardwareProfile {
  const cpuValue = getCheckedValue('cpu', CPU_TYPES.AMD_X3D)
  const gpuValue = getCheckedValue('gpu', GPU_TYPES.NVIDIA)

  return {
    cpu: isCpuType(cpuValue) ? cpuValue : CPU_TYPES.AMD_X3D,
    gpu: isGpuType(gpuValue) ? gpuValue : GPU_TYPES.NVIDIA,
    peripherals: collectCheckedValues('peripheral').filter(isPeripheralType) as PeripheralType[],
    monitorSoftware: collectCheckedValues('monitor-software').filter(
      isMonitorSoftwareType,
    ) as MonitorSoftwareType[],
  }
}

function collectSelectedPackages(): { packages: PackageKey[]; missing: string[] } {
  const packages: PackageKey[] = []
  const missing: string[] = []
  const unique = new Set<string>()

  for (const key of app.selected) {
    if (key in app.software) {
      if (!unique.has(key)) {
        packages.push(key)
        unique.add(key)
      }
    }
  }

  for (const peripheral of collectCheckedValues('peripheral')) {
    const mapped = PERIPHERAL_PACKAGE_MAP[peripheral]
    if (!mapped) {
      missing.push(peripheral)
      continue
    }
    if (mapped in app.software) {
      if (!unique.has(mapped)) {
        packages.push(mapped as PackageKey)
        unique.add(mapped)
      }
    } else {
      missing.push(mapped)
    }
  }

  return { packages, missing }
}

function applySafeMode(): void {
  document.querySelectorAll<HTMLInputElement>('input[name="opt"]').forEach((input) => {
    setInputChecked(input, input.defaultChecked)
  })

  document.querySelectorAll<HTMLInputElement>('input[name="cpu"]').forEach((input) => {
    setInputChecked(input, input.defaultChecked)
  })

  document.querySelectorAll<HTMLInputElement>('input[name="gpu"]').forEach((input) => {
    setInputChecked(input, input.defaultChecked)
  })

  document.querySelectorAll<HTMLInputElement>('input[name="peripheral"]').forEach((input) => {
    setInputChecked(input, input.defaultChecked)
  })

  document.querySelectorAll<HTMLInputElement>('input[name="monitor-software"]').forEach((input) => {
    setInputChecked(input, input.defaultChecked)
  })

  const defaults: PackageKey[] = []
  for (const [key, pkg] of Object.entries(app.software)) {
    if (pkg.selected) defaults.push(key as PackageKey)
  }

  if (defaults.length > 0) {
    setSelection(defaults)
  }

  setActivePreset(null)
  clearRecommendedPackages()
  setFilter(FILTER_ALL)
}

type SavedProfile = {
  version: string
  created: string
  hardware: HardwareProfile
  optimizations: string[]
  software: string[]
}

function buildProfile(): SavedProfile {
  return {
    version: PROFILE_VERSION,
    created: new Date().toISOString(),
    hardware: collectHardwareProfile(),
    optimizations: collectCheckedValues('opt'),
    software: Array.from(app.selected),
  }
}

function applyProfile(profile: SavedProfile): void {
  if (profile.hardware?.cpu) {
    setRadioValue('cpu', profile.hardware.cpu)
  }
  if (profile.hardware?.gpu) {
    setRadioValue('gpu', profile.hardware.gpu)
  }

  setCheckedGroup('peripheral', new Set(profile.hardware?.peripherals ?? []))
  setCheckedGroup('monitor-software', new Set(profile.hardware?.monitorSoftware ?? []))
  setCheckedGroup('opt', new Set(profile.optimizations ?? []))

  if (Array.isArray(profile.software)) {
    setSelection(profile.software.filter((key) => key in app.software) as PackageKey[])
  }
}

function setRadioValue(name: string, value: string): void {
  document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach((input) => {
    setInputChecked(input, input.value === value)
  })
}

function setCheckedGroup(name: string, values: Set<string>): void {
  document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach((input) => {
    setInputChecked(input, values.has(input.value))
  })
}

function setInputChecked(input: HTMLInputElement, checked: boolean): void {
  if (input.checked === checked) return
  input.checked = checked
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

function collectCheckedValues(name: string): string[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`),
  ).map((input) => input.value)
}

function getCheckedValue(name: string, fallback: string): string {
  const input = document.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)
  return input?.value ?? fallback
}

function splitDataList(value?: string): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
