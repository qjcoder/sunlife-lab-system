import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/store/auth-store";

/**
 * ====================================================
 * ProtectedRoute
 * ====================================================
 *
 * Purpose:
 * - Blocks unauthenticated users
 * - Used as FIRST guard before RoleRoute
 *
 * Behavior:
 * - ⏳ Waits for auth rehydration
 * - 🔐 Redirects unauthenticated users to /login
 * - ✅ Allows authenticated users through
 *
 * Usage:
 * <Route element={<ProtectedRoute />}>
 *   <Route element={<RoleRoute allowedRoles={[...]} />}>
 *     ...
 *   </Route>
 * </Route>
 */
const ProtectedRoute = () => {
  const { user, isLoading } = useAuth();

  // ⏳ Prevent redirect flicker on page refresh
  if (isLoading) {
    return null; // later: replace with spinner
  }

  // 🔐 Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Authenticated
  return <Outlet />;
};

export default ProtectedRoute;