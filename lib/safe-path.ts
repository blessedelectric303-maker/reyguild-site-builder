// Keep auth return URLs on this origin, including after browser URL normalization.
export function safePath(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (/[\\\u0000-\u0020\u007f]/.test(value)) return fallback;
  try {
    const base = "https://reyguild.invalid";
    const target = new URL(value, base);
    if (target.origin !== base) return fallback;
    return target.pathname + target.search + target.hash;
  } catch {
    return fallback;
  }
}
