import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const ITEM_SUFFIX_MAP: Record<string, string> = {
  'C':   'Carcass Only',
  'S':   'Slab door component only',
  'LS':  'Lacquered Slab door component only',
  'T':   'Timber door component only',
  'VD':  'Vinyl door component only',
  'BG':  'Black Glass door component only',
  'BGT': 'Carcass + Black Glass total',
  'ST':  'Carcass + Slab total',
  'LST': 'Carcass + Lacquered Slab total',
  'TT':  'Carcass + Timber total',
  'VDT': 'Carcass + Vinyl total',
};

/** Returns door-type label from a suffixed item code like "100D-BG", or null if not recognised. */
export function getDoorTypeFromItemCode(code: string): string | null {
  if (!code.includes('-')) return null;
  const suffix = code.split('-').slice(1).join('-').toUpperCase();
  return ITEM_SUFFIX_MAP[suffix] ?? null;
}

/** Maps a suffix to the pricelist DOOR_TYPES value used for highlighting the correct price column. */
const SUFFIX_TO_PRICELIST_DOOR_TYPE: Record<string, string> = {
  'C':   'Carcass Only',
  'S':   'Slab',
  'LS':  'Lacquered Slab',
  'T':   'Timber',
  'VD':  'Vinyl',
  'BG':  'Black Glass',
  'BGT': 'Black Glass',
  'ST':  'Slab',
  'LST': 'Lacquered Slab',
  'TT':  'Timber',
  'VDT': 'Vinyl',
};

/** Returns the pricelist door-type value (e.g. "Lacquered Slab") from item code suffix, or null. */
export function getPricelistDoorTypeFromCode(code: string): string | null {
  if (!code.includes('-')) return null;
  const suffix = code.split('-').slice(1).join('-').toUpperCase();
  return SUFFIX_TO_PRICELIST_DOOR_TYPE[suffix] ?? null;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getInitials = (str: string): string => {
  if (typeof str !== "string" || !str.trim()) return "?";

  return (
    str
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?"
  );
};

export function formatCurrency(
  amount: number,
  opts?: {
    currency?: string;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    noDecimals?: boolean;
  },
) {
  const { currency = "USD", locale = "en-US", minimumFractionDigits, maximumFractionDigits, noDecimals } = opts ?? {};

  const formatOptions: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    minimumFractionDigits: noDecimals ? 0 : minimumFractionDigits,
    maximumFractionDigits: noDecimals ? 0 : maximumFractionDigits,
  };

  return new Intl.NumberFormat(locale, formatOptions).format(amount);
}
