/** Canvas geometry. Values are in flow coordinates, not screen pixels. */
export const LAYOUT = {
  node: { width: 220, height: 110 },
  branchLabel: { width: 150, height: 48 },
  adderSize: 34,
  /** Horizontal spacing between a branch label, its actions and the trailing adder. */
  branchGapX: 60,
  /** Vertical spacing added between branch rows. */
  branchRowGap: 92,
  /** Distance from a branch action to its branch labels. */
  branchLabelOffsetX: 270,
  container: { padding: 28, headerHeight: 30 },
  /** Offset applied when inserting after an existing action. */
  insertOffset: { x: 220, y: 120 },
  /** Fallback grid used when an action is appended without a reference node. */
  newActionGrid: {
    columns: 3,
    stepX: 260,
    stepY: 170,
    originX: 40,
    originY: 70,
  },
  startPosition: { x: 40, y: 180 },
  outputPosition: { x: 1420, y: 180 },
} as const;

export const OVERLAY_CASCADE = {
  step: 34,
  resetX: 420,
  resetY: 320,
  origin: 40,
} as const;
