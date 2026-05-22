// ─── Chart colors ─────────────────────────────────────────────────────────────

/**
 * Shared color palette for Recharts charts across the app.
 * Import this instead of defining a local array in each feature file.
 *
 * Usage:
 *   fill={CHART_COLORS[i % CHART_COLORS.length]}
 */
export const CHART_COLORS = [
  '#6366f1', // indigo
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#ec4899', // pink
  '#f97316', // orange
  '#84cc16', // lime
] as const;
