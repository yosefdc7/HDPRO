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
  PURCHASE_RECEIVED: {
    label: "Purchase received",
    shortLabel: "PUR",
    emoji: "📥",
    direction: "in",
    badgeClass: "bg-green-100 text-green-700 border-green-200",
    textClass: "text-green-600",
    iconBgClass: "bg-green-100 text-green-600",
    solidClass: "bg-green-600",
    dotClass: "bg-green-500",
  },
  SALE: {
    label: "Sale",
    shortLabel: "SALE",
    emoji: "📤",
    direction: "out",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    textClass: "text-blue-600",
    iconBgClass: "bg-blue-100 text-blue-600",
    solidClass: "bg-blue-600",
    dotClass: "bg-blue-500",
  },
  ADJUSTMENT: {
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
  DAMAGE: {
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
  RETURN_IN: {
    label: "Return in",
    shortLabel: "R+",
    emoji: "↩️",
    direction: "in",
    badgeClass: "bg-cyan-100 text-cyan-700 border-cyan-200",
    textClass: "text-cyan-600",
    iconBgClass: "bg-cyan-100 text-cyan-600",
    solidClass: "bg-cyan-600",
    dotClass: "bg-cyan-500",
  },
  RETURN_OUT: {
    label: "Return out",
    shortLabel: "R−",
    emoji: "↪️",
    direction: "out",
    badgeClass: "bg-sky-100 text-sky-700 border-sky-200",
    textClass: "text-sky-600",
    iconBgClass: "bg-sky-100 text-sky-600",
    solidClass: "bg-sky-600",
    dotClass: "bg-sky-500",
  },
  TRANSFER_IN: {
    label: "Transfer in",
    shortLabel: "T+",
    emoji: "⏬",
    direction: "in",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
    textClass: "text-emerald-600",
    iconBgClass: "bg-emerald-100 text-emerald-600",
    solidClass: "bg-emerald-600",
    dotClass: "bg-emerald-500",
  },
  TRANSFER_OUT: {
    label: "Transfer out",
    shortLabel: "T−",
    emoji: "⏫",
    direction: "out",
    badgeClass: "bg-violet-100 text-violet-700 border-violet-200",
    textClass: "text-violet-600",
    iconBgClass: "bg-violet-100 text-violet-600",
    solidClass: "bg-violet-600",
    dotClass: "bg-violet-500",
  },
  DELIVERY_RECEIVED: {
    label: "Delivery received",
    shortLabel: "DEL",
    emoji: "🚚",
    direction: "in",
    badgeClass: "bg-teal-100 text-teal-700 border-teal-200",
    textClass: "text-teal-600",
    iconBgClass: "bg-teal-100 text-teal-600",
    solidClass: "bg-teal-600",
    dotClass: "bg-teal-500",
  },
};

export function getMovementDisplaySign(type: MovementType): "+" | "-" | "±" {
  const direction = MOVEMENT_UI_META[type].direction;
  if (direction === "in") return "+";
  if (direction === "out") return "-";
  return "±";
}
