/**
 * Script Generator - Pure PowerShell script generation
 *
 * Generates self-contained PowerShell scripts from user selections.
 * No DOM dependencies - pure functions only.
 */

import type { HardwareProfile, PackageKey, SoftwareCatalog } from './types'

export type SelectionState = {
  hardware: HardwareProfile
  optimizations: string[]
  packages: PackageKey[]
  missingPackages: string[]
}

export type ScriptGeneratorOptions = {
  /** Software catalog for package lookups */
  catalog: SoftwareCatalog
  /** DNS provider for network optimization (default: 'cloudflare') */
  dnsProvider?: string
}

const DEFAULT_DNS_PROVIDER = 'cloudflare'

/**
 * Build a complete PowerShell script from selection state
 */
export function buildScript(selection: SelectionState, options: ScriptGeneratorOptions): string {
  const { hardware, optimizations, packages, missingPackages } = selection
  const { catalog, dnsProvider = DEFAULT_DNS_PROVIDER } = options
  const selected = new Set(optimizations)

  const lines: string[] = []
  lines.push('#Requires -RunAsAdministrator')
  lines.push('# RockTune generated script')
  lines.push(`# Generated: ${new Date().toISOString()}`)
  lines.push(`# CPU: ${hardware.cpu}`)
  lines.push(`# GPU: ${hardware.gpu}`)
  lines.push(`# Software: ${packages.length} package(s) selected`)
  lines.push('')
  lines.push('$ErrorActionPreference = "Stop"')
  lines.push('$ProgressPreference = "SilentlyContinue"')
  lines.push('')
  lines.push('$repoRoot = $PSScriptRoot')
  lines.push(
    '$repoZip = "https://github.com/thepedroferrari/windows-gaming-settings/archive/refs/heads/master.zip"',
  )
  lines.push('$repoDir = Join-Path $env:TEMP "rocktune"')
  lines.push('$repoExtracted = Join-Path $repoDir "windows-gaming-settings-master"')
  lines.push('if (-not (Test-Path (Join-Path $repoRoot "modules"))) {')
  lines.push('  Write-Host "Downloading RockTune repo..."')
  lines.push('  New-Item -ItemType Directory -Path $repoDir -Force | Out-Null')
  lines.push('  $zipPath = Join-Path $repoDir "rocktune.zip"')
  lines.push('  Invoke-WebRequest -Uri $repoZip -OutFile $zipPath')
  lines.push('  Expand-Archive -Path $zipPath -DestinationPath $repoDir -Force')
  lines.push('  Remove-Item $zipPath -Force')
  lines.push('  $repoRoot = $repoExtracted')
  lines.push('}')
  lines.push('Set-Location $repoRoot')
  lines.push('')
  lines.push('Import-Module (Join-Path $repoRoot "modules\\core\\logger.psm1") -Force -Global')
  lines.push('Import-Module (Join-Path $repoRoot "modules\\core\\registry.psm1") -Force -Global')
  lines.push(
    'Import-Module (Join-Path $repoRoot "modules\\optimizations\\system.psm1") -Force -Global',
  )
  lines.push(
    'Import-Module (Join-Path $repoRoot "modules\\optimizations\\amd-x3d.psm1") -Force -Global',
  )
  lines.push(
    'Import-Module (Join-Path $repoRoot "modules\\optimizations\\performance.psm1") -Force -Global',
  )
  lines.push(
    'Import-Module (Join-Path $repoRoot "modules\\optimizations\\power.psm1") -Force -Global',
  )
  lines.push(
    'Import-Module (Join-Path $repoRoot "modules\\optimizations\\network.psm1") -Force -Global',
  )
  lines.push(
    'Import-Module (Join-Path $repoRoot "modules\\optimizations\\audio.psm1") -Force -Global',
  )
  lines.push(
    'Import-Module (Join-Path $repoRoot "modules\\optimizations\\privacy.psm1") -Force -Global',
  )
  lines.push(
    'Import-Module (Join-Path $repoRoot "modules\\optimizations\\gpu.psm1") -Force -Global',
  )
  lines.push('')
  lines.push('$logPath = Join-Path $repoRoot "rocktune-setup.log"')
  lines.push('Initialize-Logger -LogPath $logPath -ClearExisting $true')
  lines.push('')
  lines.push(`$cpuType = "${hardware.cpu}"`)
  lines.push(`$gpuType = "${hardware.gpu}"`)
  lines.push('')

  if (selected.has('restore_point')) {
    lines.push('# Safety')
    lines.push('New-RestorePoint -Description "RockTune-Preflight"')
    lines.push('')
  }

  if (hardware.cpu === 'amd_x3d') {
    lines.push('# AMD X3D')
    lines.push('Invoke-X3DOptimizations')
    lines.push('')
  }

  const systemLines: string[] = []
  if (selected.has('pagefile')) systemLines.push('Set-PageFile')
  if (selected.has('fastboot')) systemLines.push('Disable-FastStartup')
  if (selected.has('explorer_speed')) systemLines.push('Disable-ExplorerAutoType')
  if (selected.has('temp_purge')) systemLines.push('Invoke-TempPurge')
  if (selected.has('classic_menu')) systemLines.push('Set-ClassicContextMenu -Enable $true')
  if (selected.has('storage_sense')) systemLines.push('Disable-StorageSense -Enable $true')
  if (selected.has('end_task')) systemLines.push('Enable-TaskbarEndTask -Enable $true')
  if (selected.has('explorer_cleanup')) systemLines.push('Remove-ExplorerClutter -Enable $true')
  if (selected.has('razer_block')) systemLines.push('Disable-RazerAutoInstall -Enable $true')
  if (selected.has('display_perf')) systemLines.push('Set-DisplayPerformance -Enable $true')
  if (selected.has('services_trim')) systemLines.push('Set-ServiceTrimSafe -Enable $true')
  if (selected.has('disk_cleanup')) systemLines.push('Invoke-DiskCleanup -Async')
  if (selected.has('mouse_accel')) systemLines.push('Disable-MouseAcceleration')
  if (selected.has('keyboard_response')) systemLines.push('Set-KeyboardResponse')

  pushSection(lines, 'System', systemLines)

  const performanceLines: string[] = []
  if (selected.has('timer')) performanceLines.push('Set-TimerResolution')
  if (selected.has('gamedvr')) performanceLines.push('Set-GameDVR -Enable $true')
  if (selected.has('msi_mode')) performanceLines.push('Enable-MSIMode')
  if (selected.has('hpet')) performanceLines.push('Disable-HPET')
  if (selected.has('game_bar')) performanceLines.push('Set-GameBarConfiguration')
  if (selected.has('hags')) performanceLines.push('Set-HAGS -Enable $true')
  if (selected.has('fso_disable'))
    performanceLines.push('Set-FullscreenOptimizations -Enable $true')
  if (selected.has('multiplane_overlay')) performanceLines.push('Disable-MultiplaneOverlay')
  if (selected.has('native_nvme')) performanceLines.push('Enable-NativeNVMe -Enable $true')
  if (selected.has('interrupt_affinity'))
    performanceLines.push('Set-InterruptAffinity -Enable $true')
  if (selected.has('process_mitigation'))
    performanceLines.push('Disable-ProcessMitigations -Enable $true')
  if (selected.has('core_isolation_off'))
    performanceLines.push('Disable-CoreIsolation -Enable $true')

  pushSection(lines, 'Performance', performanceLines)

  const powerLines: string[] = []
  if (selected.has('ultimate_perf')) {
    powerLines.push('Set-UltimatePerformancePlan')
  } else if (selected.has('power_plan')) {
    powerLines.push('Set-PowerPlan')
  }
  if (selected.has('usb_power') || selected.has('usb_suspend')) {
    powerLines.push('Disable-USBSelectiveSuspend')
  }
  if (selected.has('pcie_power')) powerLines.push('Disable-PCIeLinkState')

  pushSection(lines, 'Power', powerLines)

  const networkLines: string[] = []
  if (selected.has('dns')) {
    networkLines.push(`Set-DNSProvider -Provider "${dnsProvider}"`)
  }
  if (selected.has('nagle') || selected.has('tcp_optimizer')) {
    networkLines.push('Set-TCPOptimizations -Enable $true')
  }
  if (selected.has('qos_gaming')) networkLines.push('Enable-QoSGaming -Enable $true')
  if (selected.has('network_throttling'))
    networkLines.push('Disable-NetworkThrottling -Enable $true')
  if (selected.has('ipv4_prefer')) networkLines.push('Set-IPv4Preference -Enable $true')
  if (selected.has('teredo_disable')) networkLines.push('Disable-Teredo -Enable $true')

  pushSection(lines, 'Network', networkLines)

  const audioLines: string[] = []
  if (selected.has('audio_enhancements')) audioLines.push('Disable-AudioEnhancements')
  if (selected.has('audio_exclusive')) audioLines.push('Set-AudioExclusiveMode -Enable $true')

  pushSection(lines, 'Audio', audioLines)

  const privacyLines: string[] = []
  if (selected.has('privacy_tier1')) privacyLines.push('Apply-PrivacyTier1Safe')
  if (selected.has('privacy_tier2')) privacyLines.push('Apply-PrivacyTier2Moderate')
  if (selected.has('privacy_tier3')) privacyLines.push('Apply-PrivacyTier3Aggressive')
  if (selected.has('bloatware')) privacyLines.push('Remove-Bloatware')
  if (selected.has('background_apps')) privacyLines.push('Set-BackgroundAppsOff')
  if (selected.has('edge_debloat')) privacyLines.push('Apply-EdgeDebloat')
  if (selected.has('copilot_disable')) privacyLines.push('Disable-Copilot')
  if (selected.has('notifications_off')) privacyLines.push('Disable-Notifications -Enable $true')
  if (selected.has('ps7_telemetry')) privacyLines.push('Disable-PS7Telemetry -Enable $true')
  if (selected.has('wpbt_disable')) privacyLines.push('Disable-WPBT -Enable $true')

  pushSection(lines, 'Privacy', privacyLines)

  if (selected.has('smt_disable')) {
    lines.push('# Manual step: disable SMT in BIOS if you choose to')
    lines.push('')
  }

  if (packages.length > 0) {
    lines.push('# Software installs (winget required)')
    lines.push('if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {')
    lines.push(
      '  Write-Log "winget not found. Install App Installer from Microsoft Store." "ERROR"',
    )
    lines.push('  return')
    lines.push('}')
    lines.push('')
    lines.push('$packages = @(')
    const sorted = packages
      .map((key) => ({ key, pkg: catalog[key] }))
      .filter((entry) => entry.pkg)
      .toSorted((a, b) => a.pkg.name.localeCompare(b.pkg.name))

    sorted.forEach((entry, index) => {
      const suffix = index === sorted.length - 1 ? '' : ','
      lines.push(`  @{ id = "${entry.pkg.id}"; name = "${entry.pkg.name}" }${suffix}`)
    })

    lines.push(')')
    lines.push('')
    lines.push('foreach ($pkg in $packages) {')
    lines.push('  Write-Log ("Installing {0}" -f $pkg.name) "INFO"')
    lines.push(
      '  winget install --id $pkg.id --silent --accept-package-agreements --accept-source-agreements',
    )
    lines.push('}')
    lines.push('')
  }

  if (missingPackages.length > 0) {
    lines.push('# Missing software mappings')
    missingPackages.forEach((missing) => {
      lines.push(`# - ${missing}`)
    })
    lines.push('')
  }

  return lines.join('\n')
}

function pushSection(lines: string[], title: string, sectionLines: string[]): void {
  if (sectionLines.length === 0) return
  lines.push(`# ${title}`)
  lines.push(...sectionLines)
  lines.push('')
}
