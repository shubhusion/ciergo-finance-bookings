const SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "AED",
};

export const currencySymbol = (code: string) => SYMBOLS[code] ?? code;

/** Amounts are stored in minor units; the UI never sees paise. */
export const toMajor = (minor: number) => Math.round(minor) / 100;

export function formatMoney(minor: number, currency = "INR"): string {
  return `${currencySymbol(currency)} ${toMajor(minor).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

/** "05 Mar '26" — matches the Figma cell exactly. */
export function formatTravelDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `${day} ${month} '${String(d.getUTCFullYear()).slice(2)}`;
}
