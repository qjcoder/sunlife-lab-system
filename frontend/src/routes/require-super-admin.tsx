import { Navigate } from "react-router-dom";
import { useAuth } from "@/store/auth-store";

/**
 * Renders children only for Super Admin (script-created, has email).
 * Other Factory Admins are redirected to dashboard.
 */
export default function RequireSuperAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "FACTORY_ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  const isSuperAdmin = user.isSuperAdmin ?? !!(user.email && user.email.includes("@"));

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
