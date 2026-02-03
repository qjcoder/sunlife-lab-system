import { useAuth } from './use-auth';
import { ROLES, Role } from '@/lib/constants';

export const useRole = () => {
  const { user } = useAuth();

  const hasRole = (role: Role | Role[]): boolean => {
    if (!user) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role);
  };

  const isFactoryAdmin = () => hasRole(ROLES.FACTORY_ADMIN);
  const isDealer = () => hasRole(ROLES.DEALER);
  const isSubDealer = () => hasRole(ROLES.SUB_DEALER);
  const isServiceCenter = () => hasRole(ROLES.SERVICE_CENTER);

  return {
    hasRole,
    isFactoryAdmin,
    isDealer,
    isSubDealer,
    isServiceCenter,
    role: user?.role,
  };
};
