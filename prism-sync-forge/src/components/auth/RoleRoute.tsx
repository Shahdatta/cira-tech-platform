import { Navigate } from "react-router-dom";
import { useRole, type AppRole } from "@/contexts/RoleContext";

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
}

/**
 * Wrap any <ProtectedRoute> child to further restrict by role.
 * Redirects to "/" if the current user's role is not in allowedRoles.
 */
export function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
  const { role } = useRole();
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
