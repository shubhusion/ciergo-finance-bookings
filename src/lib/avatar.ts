const AVATAR_COLORS: Record<string, string> = {
  rose: "#F43F5E",
  violet: "#8B5CF6",
  purple: "#A855F7",
  sky: "#0EA5E9",
  amber: "#F59E0B",
  teal: "#14B8A6",
  indigo: "#6366F1",
  pink: "#EC4899",
  emerald: "#10B981",
  orange: "#F97316",
  cyan: "#06B6D4",
};

/**
 * There's no photo library for seeded users, so the topbar avatar is a
 * generated silhouette (not a real photo of anyone) tinted per colorToken —
 * this gives it a photo-shaped avatar instead of a flat initials badge.
 */
export function avatarDataUri(colorToken: string): string {
  const color = AVATAR_COLORS[colorToken] ?? AVATAR_COLORS.violet;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<circle cx="32" cy="32" r="32" fill="${color}"/>` +
    `<circle cx="32" cy="25" r="11" fill="#fff" fill-opacity="0.92"/>` +
    `<path d="M9 57c0-13.8 10.3-21 23-21s23 7.2 23 21" fill="#fff" fill-opacity="0.92"/>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
