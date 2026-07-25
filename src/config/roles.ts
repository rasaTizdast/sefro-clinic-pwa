export type Role = "admin" | "employee";

export const routePermissions: Record<string, Role[]> = {
  "/": ["admin", "employee"],
  "/patients": ["admin", "employee"],
  "/calendar": ["admin", "employee"],
  "/services": ["admin", "employee"],
  "/warehouse": ["admin", "employee"],
  "/accounting": ["admin", "employee"],
  "/analytics": ["admin", "employee"],
  "/settings": ["admin", "employee"],
  "/logs": ["admin"],
};

export function hasAccess(role: Role, path: string): boolean {
  const allowed = routePermissions[path];
  if (!allowed) return false;
  return allowed.includes(role);
}
