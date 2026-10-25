/**
 * Minimal className joiner. Filters out falsy values and joins with a space.
 * Keeps a single, predictable place for conditional class composition without
 * pulling in an extra dependency.
 */
export function cn(...values) {
  return values.filter(Boolean).join(" ");
}
