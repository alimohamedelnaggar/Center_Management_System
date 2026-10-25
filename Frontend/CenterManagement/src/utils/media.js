const HUB_BASE_URL = import.meta.env.VITE_HUB_API_URL || "";

/**
 * The upload endpoint returns only the stored image name (e.g. "abc.png").
 * Convert it into an absolute public URL for rendering.
 */
export function resolveImageUrl(name, folder = "centers") {
  if (!name) return null;

  // Already an absolute URL / data URI -> use as-is.
  if (/^(https?:|data:|blob:)/i.test(name)) return name;

  const base = HUB_BASE_URL.endsWith("/")
    ? HUB_BASE_URL
    : `${HUB_BASE_URL}/`;

  return `${base}images/${folder}/${name}`;
}
