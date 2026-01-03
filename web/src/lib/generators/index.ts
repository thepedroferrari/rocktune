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

// Types
export * from './types'

// Generators
export { generateRegistryOpt, generateRegistryBatch } from './registry'
export { generateServiceOpt, generateServicePatternOpt } from './service'
export {
  generateCommandOpt,
  generatePowerCfgOpt,
  generateNetworkAdapterOpt,
  generateBcdeditOpt,
} from './command'
