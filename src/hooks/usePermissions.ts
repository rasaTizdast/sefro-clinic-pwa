import { useMemo } from "react";

import { useAuth } from "../contexts/AuthContext";

interface Permissions {
  canDelete: boolean;
  canManageUsers: boolean;
  canViewLogs: boolean;
  /** admin: refund sales, manage rates/categories/rules */
  canManageFinance: boolean;
}

export function usePermissions(): Permissions {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) {
      return {
        canDelete: false,
        canManageUsers: false,
        canViewLogs: false,
        canManageFinance: false,
      };
    }

    const isAdmin = user.role === "admin";

    return {
      canDelete: isAdmin,
      canManageUsers: isAdmin,
      canViewLogs: isAdmin,
      canManageFinance: isAdmin,
    };
  }, [user]);
}
