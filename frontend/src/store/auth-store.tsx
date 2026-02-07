import React, { createContext, useContext, useEffect, useState } from "react";

export type UserRole =
  | "FACTORY_ADMIN"
  | "DEALER"
  | "SUB_DEALER"
  | "SERVICE_CENTER"
  | "DATA_ENTRY_OPERATOR"
  | "INSTALLER_PROGRAM_MANAGER";

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  /** True when script-created admin (has email); only they can delete other admins */
  isSuperAdmin?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * ====================================================
 * AUTH PROVIDER
 * ====================================================
 * - Stores JWT + user in memory
 * - Persists to localStorage for refresh safety
 * - Backend remains source of truth
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /* --------------------------------------------------
   * Restore session on refresh
   * -------------------------------------------------- */
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  /* --------------------------------------------------
   * Login
   * -------------------------------------------------- */
  const login = (jwtToken: string, userData: AuthUser) => {
    setToken(jwtToken);
    setUser(userData);

    localStorage.setItem("token", jwtToken);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  /* --------------------------------------------------
   * Logout
   * -------------------------------------------------- */
  const logout = () => {
    setToken(null);
    setUser(null);

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Hard redirect to reset app state
    window.location.replace("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * ====================================================
 * AUTH HOOK
 * ====================================================
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
