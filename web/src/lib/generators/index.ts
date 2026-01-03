/**
 * Generator Modules - Structured PowerShell code generation
 *
 * These generators provide consistent patterns for:
 * - Registry optimizations
 * - Service optimizations
 * - Command optimizations (bcdedit, powercfg, netsh)
 *
 * Each generator produces PowerShell code with:
 * - Tier-prefixed comments ([SAFE], [CAUTION], [RISKY], [LUDICROUS])
 * - Consistent feedback (Write-OK, Write-Fail, Write-Warn)
 * - Optional reboot tracking (Add-RebootReason)
 */

export {
  generateBcdeditOpt,
  generateCommandOpt,
  generateNetworkAdapterOpt,
  generatePowerCfgOpt,
} from './command'

// Generators
export { generateRegistryBatch, generateRegistryOpt } from './registry'
export { generateServiceOpt, generateServicePatternOpt } from './service'
// Types
export * from './types'
