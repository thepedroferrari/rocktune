/**
 * General Windows cleanup tools that RockTune hands off to, and the gaming
 * compatibility checks RockTune runs after them.
 *
 * RockTune covers gaming only. Removing preinstalled apps, telemetry, ads,
 * Bing search, Edge and OneDrive is the job of WinUtil and Win11Debloat.
 * Some optional settings in those tools turn off parts of Windows that games
 * need (Xbox sign-in, Game Bar, the Store). COMPAT_CHECKS lists what the
 * generated script and run.ps1 check and offer to restore.
 */

export interface PartnerTool {
  readonly id: 'winutil' | 'win11debloat'
  readonly name: string
  readonly author: string
  readonly url: string
  /** Paste into an admin PowerShell window */
  readonly command: string
  readonly bestAt: string
}

export const PARTNER_TOOLS: readonly PartnerTool[] = [
  {
    id: 'winutil',
    name: 'WinUtil',
    author: 'Chris Titus Tech',
    url: 'https://github.com/ChrisTitusTech/winutil',
    command: 'irm "https://christitus.com/win" | iex',
    bestAt:
      'One window to install programs, turn off telemetry, remove apps and repair Windows Update.',
  },
  {
    id: 'win11debloat',
    name: 'Win11Debloat',
    author: 'Raphire',
    url: 'https://github.com/Raphire/Win11Debloat',
    command: '& ([scriptblock]::Create((irm "https://debloat.raphi.re/")))',
    bestAt:
      'Removes preinstalled apps and turns off telemetry, ads and Bing search on Windows 10 and 11, with an undo for each change.',
  },
] as const

/** One line for the generated script banner and the website handoff card */
export const PARTNER_HANDOFF_LINE =
  'General Windows cleanup (apps, telemetry, ads, Edge, OneDrive) is the job of WinUtil or Win11Debloat.'

/** Advice for running either tool without breaking games */
export const PARTNER_SAFE_USE =
  'Run either tool on its default settings. Do not tick removal of Xbox, Gaming Overlay, Xbox Identity Provider, Xbox TCUI or the Microsoft Store.'

export interface CompatCheck {
  readonly id: string
  readonly label: string
  /** Why the setting matters for gaming */
  readonly why: string
  /** True when the script can restore it without user action */
  readonly restorable: boolean
  /** Critical on AMD X3D dual-CCD CPUs */
  readonly x3dCritical?: boolean
}

export const COMPAT_CHECKS: readonly CompatCheck[] = [
  {
    id: 'xbox_services',
    label: 'Xbox services',
    why: 'Disabled Xbox services break Game Pass, Xbox sign-in inside PC games, cloud saves and Xbox controller updates.',
    restorable: true,
  },
  {
    id: 'game_bar_app',
    label: 'Xbox Game Bar',
    why: 'On AMD X3D dual-CCD CPUs, the V-Cache driver uses Game Bar to detect games. Without it, games can run on the slower half of the CPU.',
    restorable: true,
    x3dCritical: true,
  },
  {
    id: 'xbox_identity',
    label: 'Xbox Identity Provider',
    why: 'Needed for Microsoft account sign-in and achievements in Game Pass games, Forza, Halo, Sea of Thieves and the Minecraft Launcher.',
    restorable: true,
  },
  {
    id: 'xbox_tcui',
    label: 'Xbox TCUI',
    why: 'Shows the Xbox sign-in and friends screens inside games.',
    restorable: true,
  },
  {
    id: 'xbox_app',
    label: 'Xbox app',
    why: 'Without the Xbox app there is no Game Pass library and no Game Pass installs.',
    restorable: true,
  },
  {
    id: 'gaming_services',
    label: 'Gaming Services',
    why: 'Game Pass and Store games need Gaming Services to install and update.',
    restorable: true,
  },
  {
    id: 'ms_store',
    label: 'Microsoft Store',
    why: 'Game Pass downloads and the Xbox app reinstall both go through the Store.',
    restorable: true,
  },
  {
    id: 'gameinput',
    label: 'GameInput service',
    why: 'Disabling it breaks controller input and vibration in games that use GameInput, such as Flight Simulator.',
    restorable: true,
  },
  {
    id: 'delivery_optimization',
    label: 'Store download service',
    why: 'Store and Game Pass downloads hang when Delivery Optimization is disabled or set to Bypass mode.',
    restorable: true,
  },
  {
    id: 'game_dvr_policy',
    label: 'Game Bar recording policy',
    why: 'A policy that blocks Game Bar recording. It helps frame rate, but streamers who record with Win+Alt+R need it removed.',
    restorable: false,
  },
  {
    id: 'teredo',
    label: 'Teredo',
    why: 'Xbox party chat and some Xbox Live multiplayer on PC need Teredo.',
    restorable: true,
  },
] as const
