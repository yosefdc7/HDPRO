/**
 * Suggested UI strings for inventory managers viewing reorder suggestions.
 * Keep tone factual; pair with tooltips that expose the underlying inputs.
 */
export const reorderManagerCopy = {
  screenTitle: "Suggested reorders",
  emptyState: "No items need replenishment right now based on current stock, incoming orders, and reorder points.",
  columnSuggested: "Suggested order",
  columnWhy: "Why this quantity",
  columnProjected: "Projected position",
  tooltipProjected:
    "On hand plus confirmed incoming. Compared to your reorder point to decide if a new purchase is suggested.",
  tooltipSuggestedBase: "Total base units we recommend bringing in after rounding to your supplier’s purchase unit.",
  tooltipSuggestedPacks:
    "Purchase units are rounded up so you only order full packs, boxes, or cases — never a fractional supplier unit.",
  flagSlowMover:
    "Low average usage — treat this suggestion as a guide and confirm with recent sales or job schedules.",
  flagSeasonal:
    "Usage may not reflect current season. Consider a seasonal forecast override before approving.",
  flagZeroUsage:
    "No recent usage was detected — verify demand before ordering; safety stock and policy targets still apply.",
  flagHighOvershoot:
    "Rounding to full purchase units adds extra stock beyond the exact calculated need. Review if space or cash is tight.",
  approveHint: "Approving creates a draft line using the suggested purchase quantity. You can adjust before sending the PO.",
  reviewQueueTitle: "Needs review",
  reviewQueueBody:
    "These items triggered a reorder signal but have unusual demand patterns. A quick manager check reduces dead stock risk.",
} as const;
