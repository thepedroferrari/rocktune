/**
 * Manual Steps Guide - Persona-aware checklist data
 *
 * This module contains manual steps that cannot be scripted but
 * are essential for optimal gaming performance.
 */

import {
  buildPersonaSectionId,
  buildSectionId,
  SECTION_PREFIXES,
} from "./section-ids";
import type { GpuType, PresetType } from "./types";
import { GPU_TYPES } from "./types";

export type ImpactLevel = "high" | "medium" | "low";

export type DifficultyLevel = "quick" | "moderate" | "advanced";

export type SafetyLevel = "safe" | "moderate" | "expert";

export interface ItemMeta {
  readonly impact?: ImpactLevel;
  readonly difficulty?: DifficultyLevel;
  readonly safety?: SafetyLevel;
}

export interface ManualStepItem extends ItemMeta {
  readonly id: string;
  readonly step: string;
  readonly check: string;
  readonly why: string;
}

export interface SettingItem extends ItemMeta {
  readonly id: string;
  readonly setting: string;
  readonly value: string;
  readonly why: string;
}

export interface SoftwareSettingItem extends ItemMeta {
  readonly id: string;
  readonly path: string;
  readonly value: string;
  readonly why: string;
}

export interface BrowserSettingItem extends ItemMeta {
  readonly id: string;
  readonly browser: string;
  readonly path: string;
  readonly setting: string;
  readonly value: string;
  readonly why: string;
}

export interface RgbSettingItem extends ItemMeta {
  readonly id: string;
  readonly software: string;
  readonly action: string;
  readonly why: string;
}

export interface PreflightCheck extends ItemMeta {
  readonly id: string;
  readonly check: string;
  readonly how: string;
  readonly fail: string;
}

export interface TroubleshootingItem extends ItemMeta {
  readonly id: string;
  readonly problem: string;
  readonly causes: readonly string[];
  readonly quickFix: string;
}

export interface GameLaunchItem extends ItemMeta {
  readonly id: string;
  readonly game: string;
  readonly platform:
    | "Steam"
    | "Epic"
    | "Battle.net"
    | "Riot"
    | "Origin"
    | "EA App";
  readonly launchOptions?: string;
  readonly notes: readonly string[];
}

export interface StreamingTroubleshootItem extends ItemMeta {
  readonly id: string;
  readonly problem: string;
  readonly solution: string;
  readonly why: string;
}

export interface DiagnosticTool extends ItemMeta {
  readonly id: string;
  readonly tool: string;
  readonly use: string;
  readonly arsenalKey?: string;
}

export interface VideoResource {
  readonly id: string;
  readonly title: string;
  readonly creator: string;
  readonly videoId: string;
  readonly description?: string;
}

export interface ManualStepSection {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly location?: string;
  readonly note?: string;
  readonly personas?: readonly PresetType[];
  readonly hardware?: GpuType;
  readonly items:
    | readonly ManualStepItem[]
    | readonly SettingItem[]
    | readonly SoftwareSettingItem[]
    | readonly BrowserSettingItem[]
    | readonly RgbSettingItem[]
    | readonly PreflightCheck[]
    | readonly TroubleshootingItem[]
    | readonly GameLaunchItem[]
    | readonly StreamingTroubleshootItem[]
    | readonly DiagnosticTool[];
}

const WINDOWS_DISPLAY_ALL: ManualStepSection = {
  id: buildSectionId("windows-display"),
  title: "Windows Display Settings",
  description: "Classic mistakes that cost people frames without them knowing",
  items: [
    {
      id: "refresh-rate",
      step: "Settings > Display > Advanced display > Refresh rate",
      check: "Set to your monitor's max (144Hz, 165Hz, 240Hz, etc.)",
      why:
        "The #1 classic mistake. People buy 144Hz monitors and run at 60Hz for months.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "gpu-scheduling",
      step: "Settings > Display > Graphics > Default graphics settings",
      check: "Hardware-accelerated GPU scheduling: ON",
      why: "Modern GPUs benefit; can reduce latency 1-2ms.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "vrr-enable",
      step: "Settings > Display > Graphics > Default graphics settings",
      check: "Variable refresh rate: ON",
      why: "Enables VRR for windowed games (G-Sync/FreeSync).",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "hdr-setting",
      step: "Settings > System > Display > HDR",
      check: "Only enable if monitor supports it AND you've calibrated",
      why: "Bad HDR is worse than no HDR. Washed out colors = misconfigured.",
      impact: "low",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "display-scale",
      step: "Right-click desktop > Display settings > Scale",
      check: "100% recommended for gaming, 125% max",
      why: "Higher scaling can cause input lag in some games.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const WINDOWS_DISPLAY_PRO: ManualStepSection = {
  id: buildSectionId("windows-display-pro"),
  title: "Windows Display (Pro)",
  description: "Additional display settings for competitive players",
  personas: ["pro_gamer"],
  items: [
    {
      id: "gpu-preference",
      step: "Settings > Display > Graphics",
      check: "Add your games and set to 'High performance'",
      why: "Forces discrete GPU, prevents iGPU mishaps on laptops.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const NVIDIA_GAMER: ManualStepSection = {
  id: buildPersonaSectionId(SECTION_PREFIXES.NVIDIA, "gamer"),
  title: "NVIDIA Control Panel",
  description: "Right-click desktop > NVIDIA Control Panel",
  hardware: GPU_TYPES.NVIDIA,
  personas: ["gamer"],
  items: [
    {
      id: "nv-low-latency",
      setting: "Low Latency Mode",
      value: "On (or use in-game Nvidia Reflex if available)",
      why:
        "In-game Reflex > driver setting. If game has Reflex (Fortnite, CS2, Valorant), use it instead.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-digital-vibrance",
      setting: "Digital Vibrance",
      value: "60%",
      why: "Boosts colors for easier enemy spotting without oversaturation.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-power-mode",
      setting: "Power Management Mode",
      value:
        "Prefer Maximum Performance (test Optimal Power on high-end systems)",
      why:
        "Max Performance prevents downclocking. Some high-end builds (Ryzen 9 + RTX 4090) may benefit from Optimal Power for sustained loads.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-texture-quality",
      setting: "Texture Filtering Quality",
      value: "Quality",
      why: "Balanced visuals, no real performance hit.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-threaded-opt",
      setting: "Threaded Optimization",
      value: "Auto",
      why: "Let driver decide per-game.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-vsync",
      setting: "Vertical Sync",
      value: "Off",
      why: "Use in-game VSync or cap with RTSS instead.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-gsync",
      setting: "G-SYNC",
      value: "Enable for fullscreen and windowed",
      why: "VRR everywhere = smoother experience.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-max-fps",
      setting: "Max Frame Rate",
      value: "3 below monitor refresh (e.g., 141 for 144Hz)",
      why: "Keeps you in VRR range, prevents tearing at cap.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-fan-curve",
      setting: "GPU Fan Curve (MSI Afterburner / vendor tool)",
      value: "More aggressive curve (e.g., 60% at 60°C, 80% at 70°C)",
      why:
        "Lower temps = higher sustained boost clocks. Trade some noise for performance.",
      impact: "medium",
      difficulty: "moderate",
      safety: "moderate",
    },
    {
      id: "nv-power-limit",
      setting: "Power Limit Slider",
      value: "Max (110-120% if available)",
      why:
        "Doesn't force higher clocks but helps sustain them under load. Monitor temps.",
      impact: "medium",
      difficulty: "moderate",
      safety: "moderate",
    },
    {
      id: "nv-driver-install",
      setting: "Driver Installation",
      value: 'Use "Custom Install" (not Express), uncheck GeForce Experience',
      why:
        "Custom install avoids bloatware. Match driver to GPU gen (560s for RTX 40, 580s for RTX 50).",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-driver-strategy",
      setting: "Driver Updates",
      value:
        "Update when new game requires it, otherwise wait for stability reports",
      why:
        "Day-1 drivers can be buggy. If stable, no need to chase newest. Roll back if issues appear.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const NVIDIA_PRO_GAMER: ManualStepSection = {
  id: buildPersonaSectionId(SECTION_PREFIXES.NVIDIA, "pro_gamer"),
  title: "NVIDIA Control Panel",
  description: "Right-click desktop > NVIDIA Control Panel",
  hardware: GPU_TYPES.NVIDIA,
  personas: ["pro_gamer"],
  note:
    "Pro Gamers: Consider NVIDIA Reflex in supported games (ON+Boost) - better than driver-level Ultra.",
  items: [
    {
      id: "nv-pro-low-latency",
      setting: "Low Latency Mode",
      value: "Ultra (or use in-game Nvidia Reflex ON + Boost)",
      why:
        "Reflex in-game takes priority. Use driver Ultra only if game lacks Reflex support.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-pro-digital-vibrance",
      setting: "Digital Vibrance",
      value: "70%",
      why:
        "Increases color saturation for better enemy visibility. Pro players (Peterbot, Veno) use 70%.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-pro-power-mode",
      setting: "Power Management Mode",
      value:
        "Prefer Maximum Performance (test Optimal Power on high-end systems)",
      why:
        "No downclocking, ever. Some high-end builds (Ryzen 9 + RTX 4090) may benefit from Optimal Power for sustained loads.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-pro-texture-quality",
      setting: "Texture Filtering Quality",
      value: "High Performance",
      why: "Frames > fidelity for competitive.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-pro-threaded-opt",
      setting: "Threaded Optimization",
      value: "On",
      why: "Force multi-threaded driver for consistent frametimes.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-pro-vsync",
      setting: "Vertical Sync",
      value: "Off",
      why: "VSync = input lag. Use Reflex or uncapped.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-pro-gsync",
      setting: "G-SYNC",
      value: "Enable for fullscreen only",
      why: "Fullscreen exclusive = lowest latency path.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-pro-scaling-mode",
      step: "NVIDIA Control Panel > Adjust desktop size and position",
      check:
        "Native res: Scaling=No Scaling, Perform on Display. Stretched: Scaling=Full Screen, Perform on GPU.",
      why:
        "Display scaling has lower latency for native. GPU scaling required for stretched resolutions.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-pro-max-fps",
      setting: "Max Frame Rate",
      value: "Off or use RTSS",
      why: "RTSS frame limiter has less latency than driver.",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "nv-pro-shader-cache",
      setting: "Shader Cache Size",
      value: "Unlimited",
      why: "Reduces stutter from shader compilation.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-pro-per-game",
      setting: "Prefer maximum performance (per-game)",
      value: "Add competitive games",
      why: "Override any eco-mode settings.",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "nv-pro-driver-install",
      step: "Download latest game-ready driver from nvidia.com",
      check:
        'Use "Custom Install" (not Express), uncheck GeForce Experience if not needed',
      why:
        "Custom install avoids bloatware. Match driver to GPU gen (560s for RTX 40, 580s for RTX 50).",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const NVIDIA_STREAMER: ManualStepSection = {
  id: buildPersonaSectionId(SECTION_PREFIXES.NVIDIA, "streamer"),
  title: "NVIDIA Control Panel",
  description: "Right-click desktop > NVIDIA Control Panel",
  hardware: GPU_TYPES.NVIDIA,
  personas: ["streamer"],
  note:
    "Streamers: Don't use Ultra latency mode - it can cause dropped frames in OBS.",
  items: [
    {
      id: "nv-stream-low-latency",
      setting: "Low Latency Mode",
      value: "On (or use in-game Nvidia Reflex if available)",
      why:
        "Ultra can cause frame drops during encoding. In-game Reflex is preferable to driver setting.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-stream-digital-vibrance",
      setting: "Digital Vibrance",
      value: "50%",
      why:
        "Keep default/neutral colors for stream viewers while maintaining natural look.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-stream-power-mode",
      setting: "Power Management Mode",
      value: "Prefer Maximum Performance",
      why: "Encoding needs consistent GPU power.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-stream-vsync",
      setting: "Vertical Sync",
      value: "Off or Fast",
      why: "Fast Sync can help with capture smoothness.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-stream-gsync",
      setting: "G-SYNC",
      value: "Enable for fullscreen and windowed",
      why: "Windowed games capture better with VRR.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-stream-cuda",
      setting: "CUDA - GPUs",
      value: "All",
      why: "OBS NVENC needs CUDA access.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-stream-driver-install",
      step: "Download latest game-ready driver from nvidia.com",
      check:
        'Use "Custom Install" (not Express), uncheck GeForce Experience if not needed',
      why:
        "Custom install avoids bloatware. Match driver to GPU gen (560s for RTX 40, 580s for RTX 50).",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const NVIDIA_BENCHMARKER: ManualStepSection = {
  id: buildPersonaSectionId(SECTION_PREFIXES.NVIDIA, "benchmarker"),
  title: "NVIDIA Control Panel",
  description: "Right-click desktop > NVIDIA Control Panel",
  hardware: GPU_TYPES.NVIDIA,
  personas: ["benchmarker"],
  note:
    "Benchmarkers: Run 3+ passes, discard first run (shader compilation), average the rest.",
  items: [
    {
      id: "nv-bench-low-latency",
      setting: "Low Latency Mode",
      value: "Off for benchmarks, Ultra for latency tests (or in-game Reflex)",
      why:
        "Off = consistent frametimes for comparisons. For latency testing, in-game Reflex is better than driver Ultra.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-bench-digital-vibrance",
      setting: "Digital Vibrance",
      value: "50% (default)",
      why: "Keep neutral for consistent benchmark conditions across tests.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-bench-power-mode",
      setting: "Power Management Mode",
      value: "Prefer Maximum Performance",
      why: "Consistent power state for repeatable runs.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-bench-vsync",
      setting: "Vertical Sync",
      value: "Off",
      why: "Uncapped for max FPS benchmarks.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-bench-gsync",
      setting: "G-SYNC",
      value: "Off during benchmarks",
      why: "VRR can skew frametime graphs.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-bench-max-fps",
      setting: "Max Frame Rate",
      value: "Off",
      why: "Let it rip for benchmark scores.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "nv-bench-shader-cache",
      setting: "Shader Cache",
      value: "Clear before each run",
      why: "C:\\Users\\[you]\\AppData\\Local\\NVIDIA\\DXCache",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "nv-bench-driver-install",
      step: "Download latest game-ready driver from nvidia.com",
      check:
        'Use "Custom Install" (not Express), uncheck GeForce Experience if not needed',
      why:
        "Custom install avoids bloatware. Match driver to GPU gen (560s for RTX 40, 580s for RTX 50).",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const AMD_GAMER: ManualStepSection = {
  id: buildPersonaSectionId(SECTION_PREFIXES.AMD, "gamer"),
  title: "AMD Adrenalin Settings",
  description: "Right-click desktop > AMD Software: Adrenalin Edition",
  hardware: GPU_TYPES.AMD,
  personas: ["gamer"],
  items: [
    {
      id: "amd-anti-lag",
      setting: "Anti-Lag",
      value: "Enabled",
      why: "AMD's answer to Reflex. Reduces input latency.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "amd-radeon-boost",
      setting: "Radeon Boost",
      value: "Enabled",
      why:
        "Dynamic resolution during fast motion. Barely noticeable, good FPS gain.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "amd-enhanced-sync",
      setting: "Enhanced Sync",
      value: "Off",
      why: "Can cause stuttering. Use FreeSync instead.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "amd-freesync",
      setting: "FreeSync",
      value: "Enabled",
      why: "VRR for tear-free gaming.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "amd-vsync",
      setting: "Wait for Vertical Refresh",
      value: "Off, unless application specifies",
      why: "Let games control VSync.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "amd-frtc",
      setting: "Frame Rate Target Control",
      value: "3 below refresh (e.g., 141)",
      why: "Stay in FreeSync range.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "amd-fan-curve",
      setting: "GPU Fan Curve (AMD Software / Afterburner)",
      value: "More aggressive curve (e.g., 60% at 60°C, 80% at 70°C)",
      why:
        "Lower temps = higher sustained boost clocks. Trade some noise for performance.",
      impact: "medium",
      difficulty: "moderate",
      safety: "moderate",
    },
    {
      id: "amd-power-limit",
      setting: "Power Limit Slider",
      value: "Max (typically +15-20%)",
      why:
        "Doesn't force higher clocks but helps sustain them under load. Monitor temps.",
      impact: "medium",
      difficulty: "moderate",
      safety: "moderate",
    },
    {
      id: "amd-driver-strategy",
      setting: "Driver Updates",
      value:
        "Update when new game requires it, otherwise wait for stability reports",
      why:
        "Day-1 drivers can be buggy. If stable, no need to chase newest. Roll back if issues appear.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const AMD_PRO_GAMER: ManualStepSection = {
  id: buildPersonaSectionId(SECTION_PREFIXES.AMD, "pro_gamer"),
  title: "AMD Adrenalin Settings",
  description: "Right-click desktop > AMD Software: Adrenalin Edition",
  hardware: GPU_TYPES.AMD,
  personas: ["pro_gamer"],
  items: [
    {
      id: "amd-pro-anti-lag",
      setting: "Anti-Lag",
      value: "Enabled (Anti-Lag+ if supported)",
      why: "Anti-Lag+ is driver-level Reflex equivalent.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "amd-pro-radeon-boost",
      setting: "Radeon Boost",
      value: "Disabled",
      why: "Competitive players want consistent resolution.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "amd-pro-enhanced-sync",
      setting: "Enhanced Sync",
      value: "Off",
      why: "Any sync = latency.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "amd-pro-freesync",
      setting: "FreeSync",
      value: "Enabled",
      why: "Still helps with tearing without VSync latency.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "amd-pro-chill",
      setting: "Radeon Chill",
      value: "Off",
      why: "Frame rate limiting = bad for competitive.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "amd-pro-sharpening",
      setting: "Image Sharpening",
      value: "Off or minimal",
      why: "Processing overhead.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const AMD_STREAMER: ManualStepSection = {
  id: buildPersonaSectionId(SECTION_PREFIXES.AMD, "streamer"),
  title: "AMD Adrenalin Settings",
  description: "Right-click desktop > AMD Software: Adrenalin Edition",
  hardware: GPU_TYPES.AMD,
  personas: ["streamer"],
  items: [
    {
      id: "amd-stream-anti-lag",
      setting: "Anti-Lag",
      value: "Enabled",
      why: "Helps without hurting capture.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "amd-stream-radeon-boost",
      setting: "Radeon Boost",
      value: "Off",
      why: "Resolution changes look bad on stream.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "amd-stream-freesync",
      setting: "FreeSync",
      value: "Enabled",
      why: "Smooth frames = smooth stream.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "amd-stream-relive",
      setting: "Record & Stream (ReLive)",
      value: "Configure if using AMD encoder",
      why: "Alternative to OBS NVENC.",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
  ] as const,
} as const;

const BIOS_ALL: ManualStepSection = {
  id: buildSectionId("bios-all"),
  title: "BIOS Settings",
  description: "Restart > DEL/F2 during POST > Enter BIOS",
  items: [
    {
      id: "bios-xmp",
      setting: "XMP / EXPO / DOCP",
      value: "Enabled",
      why:
        "RAM runs at advertised speed instead of JEDEC (2133MHz). Free performance.",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "bios-rebar",
      setting: "Resizable BAR / Smart Access Memory",
      value: "Enabled",
      why: "GPU can access full VRAM. 5-10% in some games.",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "bios-csm",
      setting: "CSM (Compatibility Support Module)",
      value: "Disabled",
      why: "Use UEFI boot. CSM is legacy.",
      impact: "low",
      difficulty: "moderate",
      safety: "moderate",
    },
    {
      id: "bios-above4g",
      setting: "Above 4G Decoding",
      value: "Enabled",
      why: "Required for Resizable BAR.",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
  ] as const,
} as const;

const BIOS_AMD_X3D: ManualStepSection = {
  id: buildSectionId("bios-amd-x3d"),
  title: "AMD X3D CPU Settings",
  description: "For 7800X3D, 9800X3D, and similar V-Cache CPUs",
  note:
    "X3D users: Game Mode in Windows + Game Bar enabled = V-Cache optimizer works. Don't disable Game Bar!",
  items: [
    {
      id: "bios-cppc",
      setting: "CPPC (Collaborative Processor Performance Control)",
      value: "Enabled / Auto",
      why: "REQUIRED for Windows to use V-Cache optimizer. DO NOT disable.",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "bios-cppc-preferred",
      setting: "CPPC Preferred Cores",
      value: "Enabled / Auto",
      why: "Lets Windows know which cores have V-Cache.",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "bios-pbo",
      setting: "PBO (Precision Boost Overdrive)",
      value: "Auto or Enabled",
      why: "Safe on X3D. Don't use Curve Optimizer aggressively.",
      impact: "medium",
      difficulty: "moderate",
      safety: "moderate",
    },
    {
      id: "bios-cpb",
      setting: "Core Performance Boost",
      value: "Enabled",
      why: "Allows boost clocks.",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "bios-x3d-power-plan",
      setting: "Windows Power Plan (Multi-CCD X3D only)",
      value:
        "Avoid 'Prefer maximum performance' on 7950X3D/7900X3D/9950X3D/9900X3D",
      why:
        "Multi-CCD X3D: Max performance can push games onto the wrong CCD (non-V-Cache). Single-CCD (7800X3D/9800X3D) is fine with any power plan.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const BIOS_INTEL: ManualStepSection = {
  id: buildSectionId("bios-intel"),
  title: "Intel CPU Settings",
  items: [
    {
      id: "bios-cstates",
      setting: "C-States",
      value: "Enabled for daily use, Disabled for benchmarking",
      why: "C-States save power but add wake latency.",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "bios-speedshift",
      setting: "Speed Shift / HWP",
      value: "Enabled",
      why: "Modern Intel frequency scaling. Better than legacy SpeedStep.",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "bios-turbo",
      setting: "Turbo Boost",
      value: "Enabled",
      why: "Higher clocks when thermal headroom exists.",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
  ] as const,
} as const;

const DISCORD_GAMER: ManualStepSection = {
  id: buildPersonaSectionId(SECTION_PREFIXES.DISCORD, "gamer"),
  title: "Discord",
  location: "Settings (gear icon)",
  personas: ["gamer"],
  items: [
    {
      id: "discord-hw-accel",
      path: "App Settings > Advanced > Hardware Acceleration",
      value: "On (usually fine)",
      why: "Offloads to GPU. Disable only if you see issues.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "discord-overlay",
      path: "App Settings > Game Overlay",
      value: "On if you want it",
      why: "Casual use, fine to keep.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "discord-streamer-mode",
      path: "App Settings > Streamer Mode",
      value: "Off",
      why: "Only needed when streaming.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const DISCORD_PRO_GAMER: ManualStepSection = {
  id: buildPersonaSectionId(SECTION_PREFIXES.DISCORD, "pro_gamer"),
  title: "Discord",
  location: "Settings (gear icon)",
  personas: ["pro_gamer"],
  note:
    "Pro tip: Run Discord in browser during matches = no background processes.",
  items: [
    {
      id: "discord-pro-hw-accel",
      path: "App Settings > Advanced > Hardware Acceleration",
      value: "Off",
      why:
        "Can cause micro-stutters in competitive games. CPU handles it fine.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "discord-pro-overlay",
      path: "App Settings > Game Overlay",
      value: "Off",
      why: "Any overlay = potential frame drop. Disable everything.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "discord-pro-activity",
      path: "App Settings > Activity Status",
      value: "Off",
      why: "Less background activity.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "discord-pro-echo",
      path: "Voice & Video > Echo Cancellation",
      value: "Off if good mic",
      why: "Processing overhead.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "discord-pro-noise",
      path: "Voice & Video > Noise Suppression",
      value: "Off or Krisp",
      why: "Standard mode uses more CPU.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "discord-pro-agc",
      path: "Voice & Video > Automatic Gain Control",
      value: "Off",
      why: "Consistent mic levels, less processing.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const DISCORD_STREAMER: ManualStepSection = {
  id: buildPersonaSectionId(SECTION_PREFIXES.DISCORD, "streamer"),
  title: "Discord",
  location: "Settings (gear icon)",
  personas: ["streamer"],
  items: [
    {
      id: "discord-stream-hw-accel",
      path: "App Settings > Advanced > Hardware Acceleration",
      value: "On",
      why: "GPU handles Discord, CPU focuses on encoding.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "discord-stream-overlay",
      path: "App Settings > Game Overlay",
      value: "On for chat",
      why: "Read chat during gameplay.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "discord-stream-mode",
      path: "App Settings > Streamer Mode",
      value: "On when live",
      why: "Hides sensitive info automatically.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const STEAM_GAMER: ManualStepSection = {
  id: buildPersonaSectionId(SECTION_PREFIXES.STEAM, "gamer"),
  title: "Steam",
  location: "Steam > Settings",
  personas: ["gamer"],
  items: [
    {
      id: "steam-overlay",
      path: "In-Game > Steam Overlay",
      value: "On",
      why: "Useful for guides, chat, browser.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "steam-fps-counter",
      path: "In-Game > FPS counter",
      value: "Optional",
      why: "Built-in, low overhead.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "steam-downloads",
      path: "Downloads > Allow downloads during gameplay",
      value: "Off",
      why: "Background downloads cause stutters.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "steam-gpu-render",
      path: "Interface > GPU accelerated rendering",
      value: "On",
      why: "Smoother Steam UI.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const STEAM_PRO_GAMER: ManualStepSection = {
  id: buildPersonaSectionId(SECTION_PREFIXES.STEAM, "pro_gamer"),
  title: "Steam",
  location: "Steam > Settings",
  personas: ["pro_gamer"],
  note:
    "Launch options for competitive games: -novid -high -threads X (check per-game)",
  items: [
    {
      id: "steam-pro-overlay",
      path: "In-Game > Steam Overlay",
      value: "Off",
      why: "Any overlay = potential stutter.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "steam-pro-fps-counter",
      path: "In-Game > FPS counter",
      value: "Off (use RTSS)",
      why: "RTSS is more accurate and configurable.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "steam-pro-downloads",
      path: "Downloads > Allow downloads during gameplay",
      value: "Off",
      why: "Zero background network.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "steam-pro-low-bandwidth",
      path: "Library > Low Bandwidth Mode",
      value: "On",
      why: "Less network chatter.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "steam-pro-notifications",
      path: "Interface > Notify me about...",
      value: "Off",
      why: "No popups during matches.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const BROWSERS_ALL: ManualStepSection = {
  id: buildSectionId("browsers-all"),
  title: "Browser Settings",
  description: "Browsers eat resources even when 'closed'",
  note:
    "Best practice: Close browsers before gaming. Use a lightweight browser (Brave) or mobile for Discord/Twitch.",
  items: [
    {
      id: "chrome-hw-accel",
      browser: "Chrome/Edge",
      path: "Settings > System",
      setting: "Use hardware acceleration",
      value: "Off when gaming",
      why: "Can conflict with game GPU usage.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "firefox-hw-accel",
      browser: "Firefox",
      path: "Settings > General > Performance",
      setting: "Use hardware acceleration",
      value: "Off when gaming",
      why: "Same GPU conflict issue.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const RGB_PRO_GAMER: ManualStepSection = {
  id: buildPersonaSectionId("rgb", "pro_gamer"),
  title: "RGB Software",
  description: "Pretty lights, ugly overhead",
  personas: ["pro_gamer"],
  note:
    "Store RGB profiles in hardware memory when possible. Then close the software.",
  items: [
    {
      id: "rgb-icue",
      software: "iCUE (Corsair)",
      action: "Close before competitive matches",
      why: "Polling rate overhead on USB bus.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "rgb-synapse",
      software: "Synapse (Razer)",
      action: "Close or use Hardware Mode",
      why: "Save profiles to device, run software-free.",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "rgb-armoury",
      software: "Armoury Crate (ASUS)",
      action: "Uninstall or disable services",
      why: "Notorious for background bloat.",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "rgb-ghub",
      software: "G Hub (Logitech)",
      action: "Set profiles, then exit",
      why: "Onboard memory mode if available.",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
  ] as const,
} as const;

const RGB_GAMER: ManualStepSection = {
  id: buildPersonaSectionId("rgb", "gamer"),
  title: "RGB Software",
  description: "Pretty lights, ugly overhead",
  personas: ["gamer"],
  items: [
    {
      id: "rgb-casual",
      software: "All RGB software",
      action: "Keep if you want, it's fine",
      why: "Minimal impact for casual play.",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const COOLING_ADVANCED: ManualStepSection = {
  id: buildSectionId(SECTION_PREFIXES.COOLING_ADVANCED),
  title: "Advanced Cooling",
  description: "Case fan optimization for better sustained performance",
  note: "Lower GPU/CPU temps = higher sustained boost clocks under load",
  items: [
    {
      id: "cooling-fan-control",
      setting: "Case Fans → GPU Temperature",
      value: "Use Fan Control app to tie case fans to GPU temp (not just CPU)",
      why:
        "Case fans exhaust GPU heat faster, keeping temps lower during gaming. Lower GPU temp = higher boost clocks sustained longer.",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "cooling-fan-curve-strategy",
      setting: "Fan Curve Strategy",
      value:
        "Use 'max of CPU/GPU temp' rule so fans follow whichever component is hotter",
      why:
        "Ensures adequate cooling for both CPU and GPU workloads without manual switching.",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "cooling-airflow-check",
      setting: "Case Airflow",
      value:
        "Ensure case can actually exhaust GPU heat (add intake/exhaust fans if needed)",
      why:
        "Even aggressive GPU fan curves won't help if hot air just recirculates inside the case.",
      impact: "medium",
      difficulty: "advanced",
      safety: "safe",
    },
  ] as const,
} as const;

const COOLING_SOFTWARE: ManualStepSection = {
  id: buildSectionId("cooling-software"),
  title: "Fan Control Software",
  description: "Coordinate chassis and GPU thermals for sustained boost clocks",
  note:
    "Fan Control allows case fans to respond to GPU temp, not just CPU. Download from getfancontrol.com or GitHub.",
  items: [
    {
      id: "fan-control-download",
      step: "Download Fan Control (free, open-source)",
      check: "Install from getfancontrol.com or GitHub releases",
      why:
        "Allows chassis fans to respond to GPU temps, not just CPU. Better heat exhaust = higher sustained clocks during gaming.",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "fan-control-dual-curve",
      step: "Fan Control > Create dual-source curve",
      check: "Set chassis fans to respond to MAX(CPU temp, GPU temp)",
      why:
        "Ensures fans ramp up for gaming (GPU heat) and productivity (CPU heat). Best of both worlds without manual switching.",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
  ] as const,
} as const;

const PREFLIGHT_ALL: ManualStepSection = {
  id: buildSectionId("preflight-all"),
  title: "Pre-Flight Checklist",
  description: "Quick sanity checks before a gaming session",
  items: [
    {
      id: "preflight-refresh-rate",
      check: "Monitor running at native refresh rate?",
      how: "Settings > Display > Advanced > Refresh rate",
      fail: "Stuck at 60Hz = wasted hardware",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "preflight-vrr",
      check: "G-Sync/FreeSync indicator showing?",
      how: "Enable OSD in NVIDIA/AMD panel, look for VRR indicator",
      fail: "VRR not active = tearing or latency",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "preflight-discrete-gpu",
      check: "Game running on discrete GPU (laptops)?",
      how: "Task Manager > GPU column, should show GPU 1",
      fail: "Using integrated GPU = terrible FPS",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "preflight-downloads",
      check: "No background downloads?",
      how: "Check Steam, Windows Update, game launchers",
      fail: "Downloads cause network and disk stutters",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "preflight-power-plan",
      check: "Power plan correct?",
      how: "powercfg /getactivescheme in terminal",
      fail: "Balanced/Power Saver = throttled performance",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "preflight-timer",
      check: "Timer tool running? (if enabled)",
      how: "Check system tray for timer-tool.ps1",
      fail: "Default 15.6ms timer = micro-stutters",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "preflight-apps",
      check: "Unnecessary apps closed?",
      how: "Check system tray, Task Manager",
      fail: "Background apps steal frames",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "preflight-drivers",
      check: "Drivers up to date?",
      how: "GeForce Experience / AMD Software / Windows Update",
      fail: "Old drivers = bugs, missing optimizations",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "preflight-antivirus",
      check: "Using lightweight antivirus?",
      how:
        "Check system tray - prefer Windows Defender over heavy third-party AV",
      fail:
        "Norton/McAfee/Avast can add significant CPU/disk overhead during gaming",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
  ] as const,
} as const;

const PREFLIGHT_PRO: ManualStepSection = {
  id: buildSectionId("preflight-pro"),
  title: "Pre-Flight (Pro)",
  description: "Extra checks for competitive players",
  personas: ["pro_gamer"],
  items: [
    {
      id: "preflight-pro-discord",
      check: "Discord hardware acceleration off?",
      how: "Discord Settings > Advanced",
      fail: "Can cause stutters in competitive",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "preflight-pro-overlay",
      check: "Steam overlay disabled for this game?",
      how: "Right-click game > Properties > In-Game",
      fail: "Overlay can drop frames",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "preflight-pro-fullscreen",
      check: "Fullscreen exclusive (not borderless)?",
      how: "In-game display settings",
      fail: "Borderless adds 1+ frame of latency",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "preflight-pro-reflex",
      check: "NVIDIA Reflex ON+Boost (if available)?",
      how: "In-game settings",
      fail: "Missing free latency reduction",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const TROUBLESHOOTING_WIFI_BLUETOOTH: ManualStepSection = {
  id: buildSectionId("troubleshooting-wifi-bt"),
  title: "Wireless/Bluetooth Stutter Fix",
  description:
    "Onboard WiFi/Bluetooth adapters can cause mouse-move stutters that don't appear in synthetic benchmarks",
  note:
    "This is a known issue where I/O from onboard wireless adapters causes GPU power to drop to ~20% during mouse movement, causing micro-stutters. Synthetic benchmarks won't show this because they have no I/O!",
  items: [
    {
      id: "wifi-bt-test",
      step: "Test: Move mouse during gameplay",
      check:
        "Watch GPU power/usage in overlay - does it drop when moving mouse?",
      why:
        "If GPU usage drops significantly when moving the mouse, onboard wireless adapters may be the culprit.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "wifi-bt-bios-fix",
      step: "Best Fix: Disable in BIOS (if you can)",
      check: "BIOS > Onboard Devices > Disable WiFi/Bluetooth",
      why:
        "Complete fix. Only do this if you don't need onboard wireless or have alternatives.",
      impact: "high",
      difficulty: "moderate",
      safety: "moderate",
    },
    {
      id: "wifi-bt-drivers",
      step: "Alternative: Install official motherboard drivers",
      check:
        "Download from your motherboard manufacturer's support page (not Windows Update)",
      why:
        "May fix or reduce the issue. Generic Windows drivers are often the problem.",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "wifi-bt-separate",
      step: "Workaround: Use separate adapters",
      check:
        "Disable onboard in BIOS, use PCIe WiFi card or USB Bluetooth dongle",
      why: "Dedicated adapters don't share the same I/O path as onboard chips.",
      impact: "high",
      difficulty: "advanced",
      safety: "moderate",
    },
  ] as const,
} as const;

const TROUBLESHOOTING_PERFORMANCE: ManualStepSection = {
  id: buildSectionId("troubleshooting-performance"),
  title: "Performance Issues",
  description: "Common FPS and stuttering problems",
  items: [
    {
      id: "trouble-60fps-cap",
      problem: "Game runs at 60 FPS even though I have a 144Hz monitor",
      causes: [
        "V-Sync enabled in-game",
        "Windows refresh rate set to 60Hz",
        "Frame rate cap in game settings",
        "NVIDIA Control Panel capping frames",
      ],
      quickFix: "Settings → Display → Advanced → Refresh rate → Set to 144Hz",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "trouble-micro-stutters",
      problem: "Micro-stutters every few seconds",
      causes: [
        "Background downloads (Steam, Windows Update)",
        "Timer resolution at default 15.6ms",
        "Power plan throttling",
        "Shader compilation",
      ],
      quickFix:
        "Run timer-tool.ps1, pause all downloads, set High Performance power plan",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "trouble-alt-tab",
      problem: "FPS drops when alt-tabbing",
      causes: [
        "Fullscreen Optimizations enabled",
        "Game loses GPU priority",
        "V-Sync mismatch",
      ],
      quickFix:
        "Right-click game .exe → Properties → Compatibility → Disable fullscreen optimizations",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "trouble-high-fps-laggy",
      problem: "High FPS but feels laggy",
      causes: [
        "High input latency (render queue)",
        "V-Sync enabled",
        "Pre-rendered frames too high",
        "Display not in VRR range",
      ],
      quickFix:
        "Enable NVIDIA Low Latency Mode Ultra or Reflex, disable V-Sync, cap FPS 3 below refresh",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "trouble-igpu",
      problem: "Game uses integrated GPU instead of dedicated",
      causes: [
        "Laptop hybrid graphics",
        "Windows GPU preference not set",
        "Monitor plugged into wrong port",
      ],
      quickFix:
        "Settings → Display → Graphics → Add game → High performance. Check monitor is plugged into GPU, not motherboard.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "trouble-1-percent-lows",
      problem: "Terrible 1% lows / stuttering",
      causes: [
        "RAM not in XMP/EXPO",
        "Background apps",
        "CPU thermal throttling",
        "Driver issues",
      ],
      quickFix:
        "Enable XMP in BIOS, close background apps, check temps with HWiNFO, DDU and reinstall drivers",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
  ] as const,
} as const;

const TROUBLESHOOTING_AUDIO: ManualStepSection = {
  id: buildSectionId("troubleshooting-audio"),
  title: "Audio Issues",
  description: "Crackling, directional audio, and mic problems",
  items: [
    {
      id: "trouble-audio-crackling",
      problem: "Audio crackling/popping during games",
      causes: [
        "DPC latency spikes",
        "Audio driver issues",
        "Sample rate mismatch",
        "USB power saving",
      ],
      quickFix:
        "Run LatencyMon to diagnose. Disable USB selective suspend. Update audio drivers from manufacturer.",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "trouble-audio-directional",
      problem: "Can't hear footsteps / directional audio is off",
      causes: [
        "Virtual surround enabled",
        "Loudness equalization on",
        "Wrong audio channels",
      ],
      quickFix:
        "Disable Windows Sonic/Dolby Atmos. Use stereo. Disable audio enhancements in Sound settings.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "trouble-mic-quiet",
      problem: "Mic too quiet / others can't hear me",
      causes: [
        "Mic boost disabled",
        "Wrong input device",
        "Discord noise gate too aggressive",
      ],
      quickFix:
        "Sound settings → Recording → Microphone → Properties → Levels → Enable Mic Boost (+10-20dB)",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const TROUBLESHOOTING_NETWORK: ManualStepSection = {
  id: buildSectionId("troubleshooting-network"),
  title: "Network Issues",
  description: "Ping, packet loss, and connection problems",
  items: [
    {
      id: "trouble-high-ping",
      problem: "High ping in games but speed test is fine",
      causes: [
        "QoS not configured",
        "Background uploads",
        "WiFi interference",
        "ISP routing issues",
      ],
      quickFix:
        "Use Ethernet. Disable background apps. Try different DNS (1.1.1.1 or 8.8.8.8). Check for packet loss with: ping google.com -t",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "trouble-rubberbanding",
      problem: "Rubber-banding / teleporting in-game",
      causes: [
        "Packet loss",
        "WiFi instability",
        "Server issues",
        "Firewall blocking",
      ],
      quickFix:
        "Test with: ping google.com -t (look for timeouts/spikes). Switch to Ethernet if on WiFi.",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "trouble-nat-type",
      problem: "NAT type Strict / Moderate",
      causes: [
        "Router UPnP disabled",
        "Ports not forwarded",
        "Double NAT (modem + router)",
      ],
      quickFix:
        "Enable UPnP in router settings. Port forward game-specific ports. Check if modem has routing enabled (put in bridge mode).",
      impact: "high",
      difficulty: "advanced",
      safety: "moderate",
    },
  ] as const,
} as const;

const TROUBLESHOOTING_CRASHES: ManualStepSection = {
  id: buildSectionId("troubleshooting-crashes"),
  title: "Crashes & Stability",
  description: "CTDs, blue screens, and random restarts",
  items: [
    {
      id: "trouble-ctd",
      problem: "Game crashes to desktop with no error",
      causes: [
        "GPU driver issue",
        "Overclock instability",
        "Corrupted game files",
        "Anti-cheat conflict",
      ],
      quickFix:
        "DDU and reinstall GPU drivers. Remove any overclock. Verify game files in launcher. Check Windows Event Viewer for clues.",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "trouble-bsod",
      problem: "Blue screen (BSOD) during gaming",
      causes: [
        "Unstable overclock",
        "Driver conflict",
        "RAM issues",
        "Overheating",
      ],
      quickFix:
        "Reset BIOS to defaults. Run memtest86 overnight. Check temps with HWiNFO. Note the STOP code and search it.",
      impact: "high",
      difficulty: "advanced",
      safety: "moderate",
    },
    {
      id: "trouble-restart",
      problem: "PC restarts during gaming (no BSOD)",
      causes: [
        "PSU insufficient for GPU power spikes",
        "CPU/GPU overheating",
        "Overclock instability",
      ],
      quickFix:
        "Check temps during gaming (>95°C = throttling). Ensure PSU has enough wattage + headroom. Remove any overclock. Check PSU cables are fully seated.",
      impact: "high",
      difficulty: "advanced",
      safety: "moderate",
    },
  ] as const,
} as const;

const PERIPHERAL_MOUSE_ALL: ManualStepSection = {
  id: buildSectionId("peripheral-mouse-all"),
  title: "Mouse Settings",
  description: "Essential mouse configuration for gaming",
  items: [
    {
      id: "mouse-polling",
      setting: "Polling Rate",
      value: "1000Hz minimum, 4000Hz+ if supported",
      why: "Higher = more frequent position updates = smoother tracking",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "mouse-dpi",
      setting: "DPI",
      value: "Personal preference, 400-1600 common for FPS",
      why:
        "Higher DPI ≠ better. Find your eDPI sweet spot (DPI × in-game sens).",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "mouse-angle-snapping",
      setting: "Angle Snapping",
      value: "Off",
      why: "Artificial straightening = bad for raw aim",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "mouse-lod",
      setting: "LOD (Lift-off Distance)",
      value: "Low/1mm if available",
      why: "Reduces unwanted tracking when lifting mouse to reposition",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "mouse-debounce",
      setting: "Debounce",
      value: "Lowest stable setting",
      why:
        "Lower = faster click registration, but too low may cause double-clicks",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
  ] as const,
} as const;

const PERIPHERAL_MOUSE_PRO: ManualStepSection = {
  id: buildSectionId("peripheral-mouse-pro"),
  title: "Mouse (Pro)",
  description: "Advanced mouse settings for competitive players",
  personas: ["pro_gamer"],
  items: [
    {
      id: "mouse-pro-calibration",
      setting: "Surface Calibration",
      value: "Calibrate to your mousepad",
      why: "Optimal tracking for your specific surface",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "mouse-pro-dpi-stages",
      setting: "DPI Stages",
      value: "Remove unused stages",
      why: "Prevents accidental DPI changes mid-game",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "mouse-pro-onboard",
      setting: "Onboard Memory",
      value: "Save profile to mouse",
      why: "Settings work without software running (less background processes)",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
  ] as const,
} as const;

const PERIPHERAL_KEYBOARD_ALL: ManualStepSection = {
  id: buildSectionId("peripheral-keyboard-all"),
  title: "Keyboard Settings",
  description: "Essential keyboard configuration",
  items: [
    {
      id: "kb-polling",
      setting: "Polling Rate",
      value: "1000Hz+",
      why: "Faster key press registration",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "kb-nkro",
      setting: "N-Key Rollover (NKRO)",
      value: "Enabled / Full",
      why:
        "All simultaneous key presses register (important for complex inputs)",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "kb-game-mode",
      setting: "Game Mode",
      value: "Enable during gaming",
      why: "Disables Windows key to prevent accidental alt-tabs",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const PERIPHERAL_KEYBOARD_PRO: ManualStepSection = {
  id: buildSectionId("peripheral-keyboard-pro"),
  title: "Keyboard (Pro)",
  description: "Advanced keyboard settings for competitive players",
  personas: ["pro_gamer"],
  items: [
    {
      id: "kb-pro-rapid-trigger",
      setting: "Rapid Trigger (if available)",
      value: "Enable for movement keys",
      why: "Faster direction changes in strafing games (Wooting, etc.)",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "kb-pro-actuation",
      setting: "Actuation Point",
      value: "Adjust based on preference",
      why: "Higher for less fatigue, lower for speed (analog keyboards)",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
  ] as const,
} as const;

const PERIPHERAL_AUDIO_ALL: ManualStepSection = {
  id: buildSectionId("peripheral-audio-all"),
  title: "Audio/Headset Settings",
  description: "Sound settings in Windows",
  location:
    "Right-click speaker icon → Sound settings → Device properties → Additional device properties",
  items: [
    {
      id: "audio-sample-rate",
      setting: "Sample Rate",
      value: "48000 Hz",
      why: "Match game audio (most games use 48kHz)",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "audio-bit-depth",
      setting: "Bit Depth",
      value: "24-bit",
      why: "Higher dynamic range than 16-bit",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "audio-spatial",
      setting: "Spatial Audio",
      value: "Off for competitive, preference otherwise",
      why: "Virtual surround can muddy directional audio in competitive",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "audio-exclusive",
      setting: "Exclusive Mode",
      value: "Allow applications to take exclusive control",
      why: "Reduces audio latency",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const PERIPHERAL_AUDIO_PRO: ManualStepSection = {
  id: buildSectionId("peripheral-audio-pro"),
  title: "Audio (Pro)",
  description: "Competitive audio settings",
  personas: ["pro_gamer"],
  location: "Speaker properties → Enhancements tab",
  items: [
    {
      id: "audio-pro-sonic",
      setting: "Windows Sonic/Dolby Atmos",
      value: "Off",
      why: "Adds processing latency. Use stereo for competitive.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "audio-pro-loudness",
      setting: "Loudness Equalization",
      value: "Off",
      why: "Compresses dynamic range, makes footsteps harder to hear",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "audio-pro-enhance",
      setting: "Audio Enhancements",
      value: "All Off",
      why: "Pure unprocessed signal to headphones",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const GAME_LAUNCH_FPS: ManualStepSection = {
  id: buildSectionId("game-launch-fps"),
  title: "FPS / Shooter Games",
  description: "Launch options for competitive shooters",
  items: [
    {
      id: "game-cs2",
      game: "CS2 / CS:GO",
      platform: "Steam",
      launchOptions: "-novid -high -tickrate 128 +fps_max 0",
      notes: [
        "-novid: Skip intro video",
        "-high: High CPU priority",
        "-tickrate 128: Practice server tickrate",
        "+fps_max 0: Uncapped (or set to monitor refresh + 1)",
        "In-game: NVIDIA Reflex = On + Boost",
        "In-game: Multicore Rendering = Enabled",
      ],
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "game-valorant",
      game: "Valorant",
      platform: "Riot",
      notes: [
        "No launch options (Riot launcher)",
        "In-game: NVIDIA Reflex = On + Boost",
        "In-game: Multithreaded Rendering = On",
        "In-game: Limit FPS = Off or slightly above refresh",
        "Note: Vanguard anti-cheat runs at boot",
        "Warning: Some Core Isolation settings conflict with Vanguard",
      ],
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "game-apex",
      game: "Apex Legends",
      platform: "Steam",
      launchOptions: "-novid -high +fps_max unlimited",
      notes: [
        "Origin/EA App: +fps_max unlimited",
        "In-game: NVIDIA Reflex = Enabled + Boost",
        "In-game: Adaptive Resolution FPS Target = 0 (disabled)",
        "In-game: V-Sync = Disabled",
        'Config: videoconfig.txt → setting.fps_max "0"',
      ],
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "game-overwatch2",
      game: "Overwatch 2",
      platform: "Battle.net",
      launchOptions: "--tank_WorkerThreadCount X",
      notes: [
        "Replace X with your physical core count",
        "In-game: NVIDIA Reflex = Enabled",
        "In-game: Reduce Buffering = On (crucial for latency!)",
        "In-game: Limit FPS = Display-based or custom cap",
        "In-game: Triple Buffering = Off",
      ],
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "game-fortnite",
      game: "Fortnite",
      platform: "Epic",
      launchOptions: "-USEALLAVAILABLECORES",
      notes: [
        "Epic launcher → Settings → Additional Command Line",
        "-PREFERREDPROCESSOR X: Pin to specific core (advanced)",
        "In-game: NVIDIA Reflex = On + Boost",
        "In-game: DirectX 12 for newer GPUs, DX11 for stability",
        "In-game: Rendering Mode = Performance for max FPS",
      ],
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
  ] as const,
} as const;

const GAME_LAUNCH_MOBA: ManualStepSection = {
  id: buildSectionId("game-launch-moba"),
  title: "MOBA / Strategy Games",
  description: "Launch options for MOBAs and RTS games",
  items: [
    {
      id: "game-dota2",
      game: "Dota 2",
      platform: "Steam",
      launchOptions: "-novid -high -dx11 +fps_max 0",
      notes: [
        "-dx11: Force DirectX 11 (more stable than Vulkan for some)",
        "-vulkan: Try Vulkan for AMD GPUs",
        "In-game: Compute Shaders = Enabled",
        "In-game: Async Compute = Enabled (NVIDIA 10-series+)",
      ],
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "game-lol",
      game: "League of Legends",
      platform: "Riot",
      notes: [
        "No launch options (Riot launcher)",
        "In-game: Cap FPS to monitor refresh (prevents GPU heat)",
        "In-game: V-Sync = Off",
        "Config: game.cfg → [Performance] → TargetFrameRate",
        "Client: Low Spec Mode = faster load times",
      ],
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const OBS_OUTPUT: ManualStepSection = {
  id: buildSectionId(SECTION_PREFIXES.OBS_OUTPUT),
  title: "OBS Output Settings",
  description: "Settings → Output → Streaming/Recording",
  personas: ["streamer"],
  items: [
    {
      id: "obs-encoder",
      setting: "Encoder",
      value: "NVENC (NVIDIA) or AMF (AMD)",
      why: "Hardware encoding = minimal CPU impact, GPU handles it",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "obs-rate-control",
      setting: "Rate Control",
      value: "CBR for streaming, CQP for recording",
      why: "CBR = consistent bitrate for Twitch/YouTube",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "obs-bitrate",
      setting: "Bitrate (1080p60)",
      value: "6000 Kbps (Twitch), 10000+ (YouTube)",
      why: "Twitch caps at 6000, YouTube allows more headroom",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "obs-keyframe",
      setting: "Keyframe Interval",
      value: "2 seconds",
      why: "Required by most streaming platforms",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "obs-preset",
      setting: "Preset",
      value: "Quality or Max Quality",
      why: "NVENC Quality ≈ x264 Medium with only ~10% GPU usage",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "obs-profile",
      setting: "Profile",
      value: "High",
      why: "Better compression efficiency than Baseline or Main",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "obs-lookahead",
      setting: "Look-ahead",
      value: "Off for low latency, On for quality",
      why: "Adds encoding delay but better bitrate allocation",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "obs-psycho-visual",
      setting: "Psycho Visual Tuning",
      value: "On",
      why: "Better perceived quality at same bitrate",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "obs-bframes",
      setting: "Max B-frames",
      value: "2",
      why: "Balance of quality and encoding latency",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const OBS_VIDEO: ManualStepSection = {
  id: buildSectionId(SECTION_PREFIXES.OBS_VIDEO),
  title: "OBS Video Settings",
  description: "Settings → Video",
  personas: ["streamer"],
  items: [
    {
      id: "obs-canvas-res",
      setting: "Base (Canvas) Resolution",
      value: "Your monitor resolution",
      why: "Capture at native, scale down if needed",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "obs-output-res",
      setting: "Output (Scaled) Resolution",
      value: "1920x1080 for most",
      why: "Higher than 1080p rarely worth the bitrate on Twitch",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "obs-downscale",
      setting: "Downscale Filter",
      value: "Lanczos (Sharpened scaling, 36 samples)",
      why: "Best quality downscale, slight performance cost",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "obs-fps",
      setting: "FPS",
      value: "60 FPS",
      why: "Match your content. 30 FPS is fine for slow-paced games.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const OBS_ADVANCED: ManualStepSection = {
  id: buildSectionId(SECTION_PREFIXES.OBS_ADVANCED),
  title: "OBS Advanced Settings",
  description: "Settings → Advanced",
  personas: ["streamer"],
  items: [
    {
      id: "obs-priority",
      setting: "Process Priority",
      value: "Above Normal",
      why: "OBS gets CPU time over background apps, but not before games",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "obs-renderer",
      setting: "Renderer",
      value: "Direct3D 11",
      why: "Most compatible. Avoid Vulkan unless troubleshooting.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "obs-color-format",
      setting: "Color Format",
      value: "NV12",
      why: "Standard for streaming, hardware encoder native format",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "obs-color-space",
      setting: "Color Space",
      value: "709",
      why: "HD standard color space",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "obs-color-range",
      setting: "Color Range",
      value: "Partial",
      why: "Full range can cause issues on some platforms/players",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const OBS_SOURCES: ManualStepSection = {
  id: buildSectionId(SECTION_PREFIXES.OBS_SOURCES),
  title: "OBS Source Settings",
  description: "When adding game sources",
  personas: ["streamer"],
  note:
    "Game Capture is always preferred over Display Capture when the game supports it",
  items: [
    {
      id: "obs-capture-type",
      setting: "Game Capture vs Display Capture",
      value: "Game Capture when possible",
      why: "Lower overhead, captures only the game, not entire screen",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "obs-capture-mode",
      setting: "Game Capture → Mode",
      value: "Capture specific window",
      why: "More reliable than 'Capture any fullscreen application'",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "obs-sli-capture",
      setting: "Game Capture → SLI/Crossfire Capture",
      value: "Off unless multi-GPU",
      why: "Adds overhead when enabled unnecessarily",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "obs-transparency",
      setting: "Game Capture → Allow Transparency",
      value: "Off",
      why: "Unnecessary processing for most games",
      impact: "low",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const OBS_TROUBLESHOOTING: ManualStepSection = {
  id: buildSectionId("obs-troubleshooting"),
  title: "Common Streaming Issues",
  description: "Quick fixes for OBS problems",
  personas: ["streamer"],
  items: [
    {
      id: "obs-encoding-overload",
      problem: "Encoding overloaded",
      solution: "Lower preset (Quality → Performance) or output resolution",
      why: "GPU encoder can't keep up with encoding demand",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "obs-dropped-network",
      problem: "Dropped frames (Network)",
      solution: "Lower bitrate or check upload speed",
      why: "Internet can't sustain the set bitrate",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "obs-dropped-rendering",
      problem: "Dropped frames (Rendering)",
      solution: "Cap game FPS, close background apps",
      why: "GPU overloaded between game rendering and encoding",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "obs-game-stutters",
      problem: "Game stutters while streaming",
      solution: "Use NVENC/AMF, cap FPS 10 below max",
      why: "Leave GPU headroom for encoding work",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "obs-black-screen",
      problem: "Black screen in Game Capture",
      solution: "Run OBS as admin, or use Display Capture",
      why: "Anti-cheat or game capture hook compatibility issue",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

const DIAGNOSTIC_TOOLS_PERFORMANCE: ManualStepSection = {
  id: buildSectionId("diagnostic-performance"),
  title: "Performance Diagnostics",
  description:
    "Tools to diagnose FPS issues, stuttering, and system bottlenecks",
  items: [
    {
      id: "diag-latencymon",
      tool: "LatencyMon",
      use:
        "Diagnose DPC latency spikes causing audio crackle or micro-stutters",
      arsenalKey: "latencymon",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "diag-hwinfo",
      tool: "HWiNFO64",
      use: "Monitor temps, clocks, and detect thermal throttling during gaming",
      arsenalKey: "hwinfo",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "diag-capframex",
      tool: "CapFrameX",
      use: "Capture and analyze frametimes for detailed benchmark comparisons",
      arsenalKey: "capframex",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "diag-afterburner",
      tool: "MSI Afterburner",
      use: "GPU monitoring overlay, frametime graphs, and overclocking",
      arsenalKey: "msiafterburner",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "diag-procexp",
      tool: "Process Explorer",
      use: "Deep process inspection, find CPU/memory hogs",
      arsenalKey: "sysinternals",
      impact: "medium",
      difficulty: "moderate",
      safety: "safe",
    },
  ] as const,
} as const;

const DIAGNOSTIC_TOOLS_HARDWARE: ManualStepSection = {
  id: buildSectionId("diagnostic-hardware"),
  title: "Hardware Diagnostics",
  description: "Tools to test and verify hardware stability",
  items: [
    {
      id: "diag-ddu",
      tool: "DDU (Display Driver Uninstaller)",
      use: "Clean GPU driver removal before fresh install - fixes many issues",
      arsenalKey: "ddu",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "diag-crystaldisk",
      tool: "CrystalDiskMark",
      use: "Test SSD/HDD speeds, diagnose slow load times",
      arsenalKey: "crystaldiskmark",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "diag-memtest",
      tool: "memtest86",
      use: "Test RAM stability overnight - catches unstable XMP profiles",
      impact: "high",
      difficulty: "advanced",
      safety: "safe",
    },
    {
      id: "diag-occt",
      tool: "OCCT",
      use: "Stress test CPU, GPU, RAM, and PSU to find stability issues",
      impact: "high",
      difficulty: "moderate",
      safety: "moderate",
    },
    {
      id: "diag-prime95",
      tool: "Prime95",
      use: "Heavy CPU stress test, reveals thermal throttling",
      impact: "high",
      difficulty: "moderate",
      safety: "moderate",
    },
  ] as const,
} as const;

const DIAGNOSTIC_TOOLS_NETWORK: ManualStepSection = {
  id: buildSectionId("diagnostic-network"),
  title: "Network Diagnostics",
  description: "Tools to diagnose ping, packet loss, and connection issues",
  items: [
    {
      id: "diag-winmtr",
      tool: "WinMTR",
      use:
        "Network path analysis - find where packet loss occurs between you and server",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "diag-pingplotter",
      tool: "PingPlotter",
      use: "Visual network route analysis with graphs over time",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "diag-wireshark",
      tool: "Wireshark",
      use: "Deep packet inspection - for advanced network troubleshooting",
      impact: "medium",
      difficulty: "advanced",
      safety: "safe",
    },
  ] as const,
} as const;

const DIAGNOSTIC_TOOLS_CRASHES: ManualStepSection = {
  id: buildSectionId("diagnostic-crashes"),
  title: "Crash Diagnostics",
  description: "Tools to analyze BSODs and game crashes",
  items: [
    {
      id: "diag-whocrashed",
      tool: "WhoCrashed",
      use: "Analyze BSOD minidump files, identifies faulty drivers",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "diag-bluescreenview",
      tool: "BlueScreenView",
      use: "Simple BSOD log viewer, shows crash history",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "diag-eventviewer",
      tool: "Event Viewer",
      use: "Built-in Windows logs - check Application and System for errors",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
  ] as const,
} as const;

const UBIQUITI_GAMING: ManualStepSection = {
  id: buildSectionId(SECTION_PREFIXES.UBIQUITI_GAMING),
  title: "Ubiquiti/UniFi Router (Gaming)",
  description: "Router settings for optimal gaming latency",
  location: "UniFi Network App → Settings",
  note: "Ethernet > WiFi always. If WiFi, use 5GHz on a clear channel.",
  items: [
    {
      id: "unifi-sqm",
      setting: "Smart Queues (Traffic Management)",
      value: "Enable on WAN with fq_codel algorithm",
      why:
        "Eliminates bufferbloat - the #1 cause of latency spikes under load. Set to 90-95% of true upload/download speeds.",
      impact: "high",
      difficulty: "advanced",
      safety: "safe",
    },
    {
      id: "unifi-dscp",
      setting: "Traffic Management → DSCP Tagging",
      value: "Tag gaming traffic as EF (46) or CS6 (48)",
      why:
        "Prioritizes game packets over downloads/streaming when bandwidth is constrained.",
      impact: "medium",
      difficulty: "advanced",
      safety: "safe",
    },
    {
      id: "unifi-wifi-channel",
      setting: "WiFi → Channel Optimization",
      value:
        "5GHz: 80MHz width on clear DFS channel, 2.4GHz: 20MHz width channel 1/6/11",
      why:
        "Wider = faster but more interference. Use WiFi analyzer to find cleanest channels. DFS channels often less congested.",
      impact: "high",
      difficulty: "moderate",
      safety: "safe",
    },
    {
      id: "unifi-band-steering",
      setting: "WiFi → Band Steering",
      value: "Prefer 5GHz",
      why:
        "Forces capable devices to faster, less congested 5GHz band with lower latency.",
      impact: "medium",
      difficulty: "quick",
      safety: "safe",
    },
    {
      id: "unifi-disable-features",
      setting: "Disable unnecessary features",
      value:
        "Turn off: Deep Packet Inspection (DPI), IDS/IPS (if not needed), Guest Portal",
      why:
        "Each feature adds CPU processing overhead and latency. Enable only what you actively use.",
      impact: "medium",
      difficulty: "moderate",
      safety: "moderate",
    },
    {
      id: "unifi-bufferbloat-test",
      setting: "Verify setup",
      value:
        "Test at waveform.com/tools/bufferbloat after configuring Smart Queues",
      why:
        "Should achieve A or A+ grade with <20ms bufferbloat under load. If not, adjust SQM bandwidth limits.",
      impact: "high",
      difficulty: "quick",
      safety: "safe",
    },
  ] as const,
} as const;

export type SectionCategory =
  | "windows"
  | "gpu"
  | "bios"
  | "software"
  | "peripherals"
  | "network"
  | "preflight"
  | "troubleshooting"
  | "games"
  | "streaming"
  | "diagnostics";

export interface SectionGroup {
  readonly id: SectionCategory;
  readonly title: string;
  readonly icon: string;
  readonly sections: readonly ManualStepSection[];
  readonly videos?: readonly VideoResource[];
}

const VIDEOS = {
  INTEL_SETTINGS: {
    id: "intel-settings",
    title: "Intel CPU Settings You NEED to Change",
    creator: "JayzTwoCents",
    videoId: "B3EW5lRIZYc",
    description: "Essential BIOS and Windows settings for Intel CPUs",
  },
  POST_BUILD: {
    id: "post-build",
    title: "What to do AFTER Building Your PC",
    creator: "JayzTwoCents",
    videoId: "xhHtHMQygzE",
    description: "First steps after a fresh Windows install",
  },
  STUTTERING_FIXES: {
    id: "stuttering-fixes",
    title: "Fix Game Stuttering & Micro-Stutters",
    creator: "JayzTwoCents",
    videoId: "YWTZkB9rVU0",
    description:
      "Diagnose and fix stuttering issues including mouse-move stutters",
  },
  PC_PERFORMANCE: {
    id: "pc-performance-setup",
    title: "You're HURTING your Performance! Check these things NOW!",
    creator: "JayzTwoCents",
    videoId: "kRJZpcbVXIg",
    description: "XMP/EXPO, fan curves, Fan Control software, VBS optimization",
  },
  NVIDIA_CS2: {
    id: "nvidia-cs2-settings",
    title: "Best Nvidia Settings for Counter-Strike 2",
    creator: "Gaming Optimization Guide",
    videoId: "FVhgaHfhMTg",
    description: "Comprehensive Nvidia Control Panel settings for CS2",
  },
  NVIDIA_2026: {
    id: "nvidia-gaming-2026",
    title: "Nvidia Settings for Gaming Updated 2026",
    creator: "Gaming Optimization Guide",
    videoId: "5mtCUTUNzs0",
    description:
      "Driver installation, digital vibrance, Reflex, and advanced settings",
  },
} as const;

const SECTION_GROUPS: readonly SectionGroup[] = [
  {
    id: "windows",
    title: "Windows Display",
    icon: "monitor",
    sections: [WINDOWS_DISPLAY_ALL, WINDOWS_DISPLAY_PRO],
    videos: [VIDEOS.POST_BUILD],
  },
  {
    id: "gpu",
    title: "GPU Settings",
    icon: "gpu",
    sections: [
      NVIDIA_GAMER,
      NVIDIA_PRO_GAMER,
      NVIDIA_STREAMER,
      NVIDIA_BENCHMARKER,
      AMD_GAMER,
      AMD_PRO_GAMER,
      AMD_STREAMER,
    ],
    videos: [VIDEOS.NVIDIA_CS2, VIDEOS.NVIDIA_2026],
  },
  {
    id: "bios",
    title: "BIOS Settings",
    icon: "chip",
    sections: [BIOS_ALL, BIOS_AMD_X3D, BIOS_INTEL],
    videos: [VIDEOS.INTEL_SETTINGS],
  },
  {
    id: "software",
    title: "Software Settings",
    icon: "apps",
    sections: [
      DISCORD_GAMER,
      DISCORD_PRO_GAMER,
      DISCORD_STREAMER,
      STEAM_GAMER,
      STEAM_PRO_GAMER,
      BROWSERS_ALL,
      RGB_PRO_GAMER,
      RGB_GAMER,
      COOLING_ADVANCED,
      COOLING_SOFTWARE,
    ],
    videos: [VIDEOS.PC_PERFORMANCE],
  },
  {
    id: "peripherals",
    title: "Peripherals",
    icon: "mouse",
    sections: [
      PERIPHERAL_MOUSE_ALL,
      PERIPHERAL_MOUSE_PRO,
      PERIPHERAL_KEYBOARD_ALL,
      PERIPHERAL_KEYBOARD_PRO,
      PERIPHERAL_AUDIO_ALL,
      PERIPHERAL_AUDIO_PRO,
    ],
  },
  {
    id: "network",
    title: "Network Configuration",
    icon: "network",
    sections: [UBIQUITI_GAMING],
  },
  {
    id: "preflight",
    title: "Pre-Flight Checklist",
    icon: "checklist",
    sections: [PREFLIGHT_ALL, PREFLIGHT_PRO],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: "wrench",
    sections: [
      TROUBLESHOOTING_PERFORMANCE,
      TROUBLESHOOTING_AUDIO,
      TROUBLESHOOTING_NETWORK,
      TROUBLESHOOTING_CRASHES,
      TROUBLESHOOTING_WIFI_BLUETOOTH,
    ],
    videos: [VIDEOS.STUTTERING_FIXES],
  },
  {
    id: "games",
    title: "Game Launch Options",
    icon: "gamepad",
    sections: [GAME_LAUNCH_FPS, GAME_LAUNCH_MOBA],
  },
  {
    id: "streaming",
    title: "Streaming (OBS)",
    icon: "broadcast",
    sections: [
      OBS_OUTPUT,
      OBS_VIDEO,
      OBS_ADVANCED,
      OBS_SOURCES,
      OBS_TROUBLESHOOTING,
    ],
  },
  {
    id: "diagnostics",
    title: "Diagnostic Tools",
    icon: "stethoscope",
    sections: [
      DIAGNOSTIC_TOOLS_PERFORMANCE,
      DIAGNOSTIC_TOOLS_HARDWARE,
      DIAGNOSTIC_TOOLS_NETWORK,
      DIAGNOSTIC_TOOLS_CRASHES,
    ],
  },
] as const;

/**
 * Filter sections based on persona and GPU type
 * Intel GPUs don't have dedicated control panels, so GPU-specific sections are filtered out
 */
function filterSections(
  sections: readonly ManualStepSection[],
  persona: PresetType,
  gpuType: GpuType,
): ManualStepSection[] {
  return sections.filter((section) => {
    if (section.hardware) {
      if (gpuType === GPU_TYPES.INTEL) {
        return false;
      }
      if (section.hardware !== gpuType) {
        return false;
      }
    }

    if (section.personas && !section.personas.includes(persona)) {
      return false;
    }

    return true;
  });
}

/**
 * Get filtered section groups for a specific persona and GPU
 */
export function getFilteredSectionGroups(
  persona: PresetType,
  gpuType: GpuType,
): SectionGroup[] {
  return SECTION_GROUPS.map((group) => ({
    ...group,
    sections: filterSections(group.sections, persona, gpuType),
  })).filter((group) => group.sections.length > 0);
}

/**
 * Count total items across all filtered sections
 */
export function countTotalItems(persona: PresetType, gpuType: GpuType): number {
  const groups = getFilteredSectionGroups(persona, gpuType);
  return groups.reduce(
    (total, group) =>
      total +
      group.sections.reduce(
        (sectionTotal, section) => sectionTotal + section.items.length,
        0,
      ),
    0,
  );
}
