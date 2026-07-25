import { useMemo } from "react";

import { useAuth } from "../contexts/AuthContext";

interface Permissions {
  canDelete: boolean;
  canManageUsers: boolean;
  canViewLogs: boolean;
}

export function usePermissions(): Permissions {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) {
      return { canDelete: false, canManageUsers: false, canViewLogs: false };
    }

    const isAdmin = user.role === "admin";

    return {
      canDelete: isAdmin,
      canManageUsers: isAdmin,
      canViewLogs: isAdmin,
    };
  }, [user]);
}
