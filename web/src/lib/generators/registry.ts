/**
 * Registry Optimization Generator
 *
 * Generates PowerShell code for registry-based optimizations with:
 * - Tier-prefixed comments
 * - Consistent feedback (Write-OK/Write-Fail)
 * - Optional reboot tracking
 */

import type { RegistryOptConfig } from './types'
import { TIER_PREFIXES } from './types'

/**
 * Generate PowerShell lines for a registry optimization
 */
export function generateRegistryOpt(config: RegistryOptConfig): string[] {
  const lines: string[] = []
  const tierPrefix = TIER_PREFIXES[config.tier]
  const comment = config.description
    ? `# ${tierPrefix} ${config.description}`
    : `# ${tierPrefix} Set ${config.name}`

  lines.push(comment)

  const regType = config.regType ?? 'DWORD'
  const valueStr = typeof config.value === 'string' ? `"${config.value}"` : config.value

  // If there are additional values, batch them together
  if (config.additionalValues && config.additionalValues.length > 0) {
    // Main value with PassThru check
    lines.push(
      `if (Set-Reg "${config.path}" "${config.name}" ${valueStr} "${regType}" -PassThru) {`,
    )

    // Additional values (no individual feedback)
    for (const av of config.additionalValues) {
      const avType = av.type ?? 'DWORD'
      const avValue = typeof av.value === 'string' ? `"${av.value}"` : av.value
      lines.push(`    Set-Reg "${config.path}" "${av.name}" ${avValue} "${avType}"`)
    }

    lines.push(`    Write-OK "${config.successMessage}"`)

    // Add reboot tracking if required
    if (config.requiresReboot && config.rebootReason) {
      lines.push(`    Add-RebootReason "${config.rebootReason}"`)
    }

    lines.push('}')
  } else {
    // Single value - use inline conditional
    if (config.requiresReboot && config.rebootReason) {
      lines.push(
        `if (Set-Reg "${config.path}" "${config.name}" ${valueStr} "${regType}" -PassThru) {`,
      )
      lines.push(`    Write-OK "${config.successMessage}"`)
      lines.push(`    Add-RebootReason "${config.rebootReason}"`)
      lines.push('}')
    } else {
      lines.push(
        `if (Set-Reg "${config.path}" "${config.name}" ${valueStr} "${regType}" -PassThru) { Write-OK "${config.successMessage}" }`,
      )
    }
  }

  return lines
}

/**
 * Generate PowerShell lines for multiple registry values under the same path
 * with a single feedback message
 */
export function generateRegistryBatch(
  tier: RegistryOptConfig['tier'],
  description: string,
  path: string,
  values: Array<{ name: string; value: number | string; type?: string }>,
  successMessage: string,
  options?: { requiresReboot?: boolean; rebootReason?: string },
): string[] {
  const lines: string[] = []
  const tierPrefix = TIER_PREFIXES[tier]

  lines.push(`# ${tierPrefix} ${description}`)

  for (const v of values) {
    const vType = v.type ?? 'DWORD'
    const vValue = typeof v.value === 'string' ? `"${v.value}"` : v.value
    lines.push(`Set-Reg "${path}" "${v.name}" ${vValue} "${vType}"`)
  }

  lines.push(`Write-OK "${successMessage}"`)

  if (options?.requiresReboot && options?.rebootReason) {
    lines.push(`Add-RebootReason "${options.rebootReason}"`)
  }

  return lines
}
