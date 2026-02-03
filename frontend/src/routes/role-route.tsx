import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/store/auth-store";

type Props = {
  allowedRoles: string[];
};

const RoleRoute = ({ allowedRoles }: Props) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default RoleRoute;