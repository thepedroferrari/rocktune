/**
 * Generator Types - Metadata for structured optimization generation
 */

import type { OptimizationTier } from '../types'

/** Common options for all optimization generators */
export interface OptGenOptions {
  /** Optimization tier for comment prefix */
  tier: OptimizationTier
  /** Short description for the comment */
  description?: string
  /** Whether this optimization requires a reboot */
  requiresReboot?: boolean
  /** Reason to display if reboot is required */
  rebootReason?: string
}

/** Registry optimization configuration */
export interface RegistryOptConfig extends OptGenOptions {
  type: 'registry'
  /** Registry path (e.g., "HKCU:\\Control Panel\\Mouse") */
  path: string
  /** Registry value name */
  name: string
  /** Value to set */
  value: number | string
  /** Registry type (default: DWORD) */
  regType?: 'DWORD' | 'String' | 'QWORD' | 'Binary'
  /** Success message */
  successMessage: string
  /** Additional registry values to set (same path, no individual feedback) */
  additionalValues?: Array<{ name: string; value: number | string; type?: string }>
}

/** Service optimization configuration */
export interface ServiceOptConfig extends OptGenOptions {
  type: 'service'
  /** Service name(s) to modify */
  services: string | string[]
  /** Action to take */
  action: 'stop' | 'disable' | 'manual' | 'stop-and-disable'
  /** Success message */
  successMessage: string
  /** Warning message (e.g., for breaking changes) */
  warningMessage?: string
}

/** Command optimization configuration (bcdedit, powercfg, netsh, etc.) */
export interface CommandOptConfig extends OptGenOptions {
  type: 'command'
  /** Command(s) to execute */
  commands: string | string[]
  /** How to check success */
  successCheck?: 'exitcode' | 'output-match' | 'always'
  /** Pattern to match in output (for output-match) */
  outputPattern?: string
  /** Success message */
  successMessage: string
  /** Failure message */
  failMessage?: string
}

/** PowerCfg optimization configuration */
export interface PowerCfgOptConfig extends OptGenOptions {
  type: 'powercfg'
  /** PowerCfg subcommand and args */
  subcommand: string
  /** Success message */
  successMessage: string
  /** Fallback message if not supported */
  fallbackMessage?: string
}

/** Network adapter optimization configuration */
export interface NetworkAdapterOptConfig extends OptGenOptions {
  type: 'network-adapter'
  /** PowerShell cmdlet to run on each adapter */
  cmdlet: string
  /** Whether to enable or disable */
  enable: boolean
  /** Success message (use $count for adapter count) */
  successMessage: string
  /** Fallback message if no adapters affected */
  fallbackMessage?: string
}

/** Union type for all optimization configs */
export type OptimizationConfig =
  | RegistryOptConfig
  | ServiceOptConfig
  | CommandOptConfig
  | PowerCfgOptConfig
  | NetworkAdapterOptConfig

/** Tier prefix map for comments */
export const TIER_PREFIXES: Record<OptimizationTier, string> = {
  safe: '[SAFE]',
  caution: '[CAUTION]',
  risky: '[RISKY]',
  ludicrous: '[LUDICROUS]',
}
