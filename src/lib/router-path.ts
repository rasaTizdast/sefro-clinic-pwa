export const ROUTER_BASENAME = import.meta.env.DEV ? "" : "/dashboard";

/** Convert a browser URL path into a path relative to React Router's basename. */
export function normalizeRouterPath(path: string | null | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/";

  let normalized = path;
  while (
    ROUTER_BASENAME &&
    (normalized === ROUTER_BASENAME || normalized.startsWith(`${ROUTER_BASENAME}/`))
  ) {
    normalized = normalized.slice(ROUTER_BASENAME.length) || "/";
  }

  return normalized.startsWith("//") ? "/" : normalized;
}

export function toAppPath(routerPath: string): string {
  const normalized = normalizeRouterPath(routerPath);
  return `${ROUTER_BASENAME}${normalized}` || "/";
}
