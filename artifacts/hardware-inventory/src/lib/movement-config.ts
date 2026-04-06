import type { MovementType } from "@/lib/store";

export type MovementDirection = "in" | "out" | "neutral";

export type MovementUiMeta = {
  label: string;
  shortLabel: string;
  emoji: string;
  direction: MovementDirection;
  badgeClass: string;
  textClass: string;
  iconBgClass: string;
  solidClass: string;
  dotClass: string;
};

export const MOVEMENT_UI_META: Record<MovementType, MovementUiMeta> = {
  in: {
    label: "Stock In",
    shortLabel: "IN",
    emoji: "📥",
    direction: "in",
    badgeClass: "bg-green-100 text-green-700 border-green-200",
    textClass: "text-green-600",
    iconBgClass: "bg-green-100 text-green-600",
    solidClass: "bg-green-600",
    dotClass: "bg-green-500",
  },
  out: {
    label: "Stock Out",
    shortLabel: "OUT",
    emoji: "📤",
    direction: "out",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    textClass: "text-blue-600",
    iconBgClass: "bg-blue-100 text-blue-600",
    solidClass: "bg-blue-600",
    dotClass: "bg-blue-500",
  },
  adjustment: {
    label: "Adjustment",
    shortLabel: "ADJ",
    emoji: "🔄",
    direction: "neutral",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    textClass: "text-amber-600",
    iconBgClass: "bg-amber-100 text-amber-600",
    solidClass: "bg-amber-600",
    dotClass: "bg-amber-500",
  },
  delivery: {
    label: "Delivery",
    shortLabel: "DEL",
    emoji: "🚚",
    direction: "in",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
    textClass: "text-emerald-600",
    iconBgClass: "bg-emerald-100 text-emerald-600",
    solidClass: "bg-emerald-600",
    dotClass: "bg-emerald-500",
  },
  damage: {
    label: "Damage",
    shortLabel: "DMG",
    emoji: "🧯",
    direction: "out",
    badgeClass: "bg-rose-100 text-rose-700 border-rose-200",
    textClass: "text-rose-600",
    iconBgClass: "bg-rose-100 text-rose-600",
    solidClass: "bg-rose-600",
    dotClass: "bg-rose-500",
  },
  return: {
    label: "Return",
    shortLabel: "RTN",
    emoji: "↩️",
    direction: "in",
    badgeClass: "bg-cyan-100 text-cyan-700 border-cyan-200",
    textClass: "text-cyan-600",
    iconBgClass: "bg-cyan-100 text-cyan-600",
    solidClass: "bg-cyan-600",
    dotClass: "bg-cyan-500",
  },
  transfer: {
    label: "Transfer",
    shortLabel: "TRF",
    emoji: "🔁",
    direction: "out",
    badgeClass: "bg-violet-100 text-violet-700 border-violet-200",
    textClass: "text-violet-600",
    iconBgClass: "bg-violet-100 text-violet-600",
    solidClass: "bg-violet-600",
    dotClass: "bg-violet-500",
  },
};

export function getMovementDisplaySign(type: MovementType): "+" | "-" | "±" {
  const direction = MOVEMENT_UI_META[type].direction;
  if (direction === "in") return "+";
  if (direction === "out") return "-";
  return "±";
}
