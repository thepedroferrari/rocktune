/**
 * Bloatware Enemy Definitions
 * Windows bloatware that serves as the invaders in Bloatware Blaster
 */

export interface BloatwareType {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const BLOATWARE_TYPES: BloatwareType[] = [
  { id: "telemetry", name: "Telemetry", icon: "📡", color: "var(--risky)" },
  { id: "cortana", name: "Cortana", icon: "🎤", color: "var(--caution)" },
  { id: "onedrive", name: "OneDrive", icon: "☁️", color: "var(--neon-cyan)" },
  {
    id: "search",
    name: "Search Index",
    icon: "🔍",
    color: "var(--neon-magenta)",
  },
  { id: "xbox", name: "Xbox Bar", icon: "🎮", color: "var(--safe)" },
];

/**
 * Get bloatware type by row index (5 rows × 11 columns)
 */
export function getBloatwareType(rowIndex: number): BloatwareType {
  return BLOATWARE_TYPES[rowIndex % BLOATWARE_TYPES.length];
}
