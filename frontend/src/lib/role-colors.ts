/**
 * ====================================================
 * ROLE-BASED COLOR SCHEMES
 * ====================================================
 * 
 * This module provides color schemes for each user role,
 * matching the login page design.
 * 
 * Color Schemes:
 * - FACTORY_ADMIN: Red theme
 * - DEALER: Blue theme
 * - SUB_DEALER: Green theme
 * - SERVICE_CENTER: Orange theme
 */

export type UserRole = "FACTORY_ADMIN" | "DEALER" | "SUB_DEALER" | "SERVICE_CENTER" | "DATA_ENTRY_OPERATOR" | "INSTALLER_PROGRAM_MANAGER" | "INSTALLER";

export interface RoleColorScheme {
  // Primary colors
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  
  // Accent colors
  accent: string;
  accentHover: string;
  accentLight: string;
  accentBorder: string;
  accentText: string;
  
  // Background gradients
  bgGradient: string;
  bgGradientLight: string;
  bgGradientDark: string;
  
  // Card colors
  cardHeader: string;
  cardBorder: string;
  
  // Button colors
  buttonPrimary: string;
  buttonPrimaryHover: string;
  buttonOutline: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  
  // Badge colors
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const getRoleColorScheme = (role: UserRole): RoleColorScheme => {
  switch (role) {
    case "FACTORY_ADMIN":
      return {
        primary: "bg-red-600",
        primaryHover: "hover:bg-red-700",
        primaryLight: "bg-red-50",
        primaryDark: "bg-red-900",
        accent: "bg-red-600",
        accentHover: "hover:bg-red-700",
        accentLight: "bg-red-50",
        accentBorder: "border-red-200",
        accentText: "text-red-600",
        bgGradient: "from-red-50 via-white to-red-100",
        bgGradientLight: "from-red-50/30 via-white/50 to-red-100/30",
        bgGradientDark: "from-red-900 via-red-800 to-red-900",
        cardHeader: "from-red-500 via-red-600 to-red-700",
        cardBorder: "border-red-200/60",
        buttonPrimary: "from-red-600 to-red-700",
        buttonPrimaryHover: "from-red-700 to-red-800",
        buttonOutline: "border-red-500 text-red-600 hover:bg-red-50",
        textPrimary: "text-red-600",
        textSecondary: "text-red-700",
        badgeBg: "bg-red-100 dark:bg-red-900/30",
        badgeText: "text-red-700 dark:text-red-400",
        badgeBorder: "border-red-200 dark:border-red-800",
      };
    case "DEALER":
      return {
        primary: "bg-blue-600",
        primaryHover: "hover:bg-blue-700",
        primaryLight: "bg-blue-50",
        primaryDark: "bg-blue-900",
        accent: "bg-blue-600",
        accentHover: "hover:bg-blue-700",
        accentLight: "bg-blue-50",
        accentBorder: "border-blue-200",
        accentText: "text-blue-600",
        bgGradient: "from-blue-50 via-white to-blue-100",
        bgGradientLight: "from-blue-50/30 via-white/50 to-blue-100/30",
        bgGradientDark: "from-blue-900 via-blue-800 to-blue-900",
        cardHeader: "from-blue-500 via-blue-600 to-blue-700",
        cardBorder: "border-blue-200/60",
        buttonPrimary: "from-blue-600 to-blue-700",
        buttonPrimaryHover: "from-blue-700 to-blue-800",
        buttonOutline: "border-blue-500 text-blue-600 hover:bg-blue-50",
        textPrimary: "text-blue-600",
        textSecondary: "text-blue-700",
        badgeBg: "bg-blue-100 dark:bg-blue-900/30",
        badgeText: "text-blue-700 dark:text-blue-400",
        badgeBorder: "border-blue-200 dark:border-blue-800",
      };
    case "SUB_DEALER":
      return {
        primary: "green-600",
        primaryHover: "green-700",
        primaryLight: "green-50",
        primaryDark: "green-900",
        accent: "green-600",
        accentHover: "green-700",
        accentLight: "green-50",
        accentBorder: "green-200",
        accentText: "green-600",
        bgGradient: "from-green-50 via-white to-green-100",
        bgGradientLight: "from-green-50/30 via-white/50 to-green-100/30",
        bgGradientDark: "from-green-900 via-green-800 to-green-900",
        cardHeader: "from-green-500 via-green-600 to-green-700",
        cardBorder: "green-200/60",
        buttonPrimary: "from-green-600 to-green-700",
        buttonPrimaryHover: "from-green-700 to-green-800",
        buttonOutline: "border-green-500 text-green-600 hover:bg-green-50",
        textPrimary: "text-green-600",
        textSecondary: "text-green-700",
        badgeBg: "bg-green-100 dark:bg-green-900/30",
        badgeText: "text-green-700 dark:text-green-400",
        badgeBorder: "border-green-200 dark:border-green-800",
      };
    case "SERVICE_CENTER":
      return {
        primary: "orange-600",
        primaryHover: "orange-700",
        primaryLight: "orange-50",
        primaryDark: "orange-900",
        accent: "orange-600",
        accentHover: "orange-700",
        accentLight: "orange-50",
        accentBorder: "orange-200",
        accentText: "orange-600",
        bgGradient: "from-orange-50 via-white to-orange-100",
        bgGradientLight: "from-orange-50/30 via-white/50 to-orange-100/30",
        bgGradientDark: "from-orange-900 via-orange-800 to-orange-900",
        cardHeader: "from-orange-500 via-orange-600 to-orange-700",
        cardBorder: "orange-200/60",
        buttonPrimary: "from-orange-600 to-orange-700",
        buttonPrimaryHover: "from-orange-700 to-orange-800",
        buttonOutline: "border-orange-500 text-orange-600 hover:bg-orange-50",
        textPrimary: "text-orange-600",
        textSecondary: "text-orange-700",
        badgeBg: "bg-orange-100 dark:bg-orange-900/30",
        badgeText: "text-orange-700 dark:text-orange-400",
        badgeBorder: "border-orange-200 dark:border-orange-800",
      };
    case "DATA_ENTRY_OPERATOR":
      return {
        primary: "purple-600",
        primaryHover: "purple-700",
        primaryLight: "purple-50",
        primaryDark: "purple-900",
        accent: "purple-600",
        accentHover: "purple-700",
        accentLight: "purple-50",
        accentBorder: "purple-200",
        accentText: "text-purple-600",
        bgGradient: "from-purple-50 via-white to-purple-100",
        bgGradientLight: "from-purple-50/30 via-white/50 to-purple-100/30",
        bgGradientDark: "from-purple-900 via-purple-800 to-purple-900",
        cardHeader: "from-purple-500 via-purple-600 to-purple-700",
        cardBorder: "purple-200/60",
        buttonPrimary: "from-purple-600 to-purple-700",
        buttonPrimaryHover: "from-purple-700 to-purple-800",
        buttonOutline: "border-purple-500 text-purple-600 hover:bg-purple-50",
        textPrimary: "text-purple-600",
        textSecondary: "text-purple-700",
        badgeBg: "bg-purple-100 dark:bg-purple-900/30",
        badgeText: "text-purple-700 dark:text-purple-400",
        badgeBorder: "border-purple-200 dark:border-purple-800",
      };
    case "INSTALLER_PROGRAM_MANAGER":
      return {
        primary: "bg-violet-600",
        primaryHover: "hover:bg-violet-700",
        primaryLight: "bg-violet-50",
        primaryDark: "bg-violet-900",
        accent: "bg-violet-600",
        accentHover: "hover:bg-violet-700",
        accentLight: "bg-violet-50",
        accentBorder: "border-violet-200",
        accentText: "text-violet-600",
        bgGradient: "from-violet-50 via-white to-violet-100",
        bgGradientLight: "from-violet-50/30 via-white/50 to-violet-100/30",
        bgGradientDark: "from-violet-900 via-violet-800 to-violet-900",
        cardHeader: "from-violet-500 via-violet-600 to-violet-700",
        cardBorder: "border-violet-200/60",
        buttonPrimary: "from-violet-600 to-violet-700",
        buttonPrimaryHover: "from-violet-700 to-violet-800",
        buttonOutline: "border-violet-500 text-violet-600 hover:bg-violet-50",
        textPrimary: "text-violet-600",
        textSecondary: "text-violet-700",
        badgeBg: "bg-violet-100 dark:bg-violet-900/30",
        badgeText: "text-violet-700 dark:text-violet-400",
        badgeBorder: "border-violet-200 dark:border-violet-800",
      };
    case "INSTALLER":
      return {
        primary: "bg-teal-600",
        primaryHover: "hover:bg-teal-700",
        primaryLight: "bg-teal-50",
        primaryDark: "bg-teal-900",
        accent: "bg-teal-600",
        accentHover: "hover:bg-teal-700",
        accentLight: "bg-teal-50",
        accentBorder: "border-teal-200",
        accentText: "text-teal-600",
        bgGradient: "from-teal-50 via-white to-teal-100",
        bgGradientLight: "from-teal-50/30 via-white/50 to-teal-100/30",
        bgGradientDark: "from-teal-900 via-teal-800 to-teal-900",
        cardHeader: "from-teal-500 via-teal-600 to-teal-700",
        cardBorder: "border-teal-200/60",
        buttonPrimary: "from-teal-600 to-teal-700",
        buttonPrimaryHover: "from-teal-700 to-teal-800",
        buttonOutline: "border-teal-500 text-teal-600 hover:bg-teal-50",
        textPrimary: "text-teal-600",
        textSecondary: "text-teal-700",
        badgeBg: "bg-teal-100 dark:bg-teal-900/30",
        badgeText: "text-teal-700 dark:text-teal-400",
        badgeBorder: "border-teal-200 dark:border-teal-800",
      };
    default:
      return {
        primary: "bg-red-600",
        primaryHover: "hover:bg-red-700",
        primaryLight: "bg-red-50",
        primaryDark: "bg-red-900",
        accent: "bg-red-600",
        accentHover: "hover:bg-red-700",
        accentLight: "bg-red-50",
        accentBorder: "border-red-200",
        accentText: "text-red-600",
        bgGradient: "from-red-50 via-white to-red-100",
        bgGradientLight: "from-red-50/30 via-white/50 to-red-100/30",
        bgGradientDark: "from-red-900 via-red-800 to-red-900",
        cardHeader: "from-red-500 via-red-600 to-red-700",
        cardBorder: "border-red-200/60",
        buttonPrimary: "from-red-600 to-red-700",
        buttonPrimaryHover: "from-red-700 to-red-800",
        buttonOutline: "border-red-500 text-red-600 hover:bg-red-50",
        textPrimary: "text-red-600",
        textSecondary: "text-red-700",
        badgeBg: "bg-red-100 dark:bg-red-900/30",
        badgeText: "text-red-700 dark:text-red-400",
        badgeBorder: "border-red-200 dark:border-red-800",
      };
  }
};

/**
 * Display name for role in UI. Script-created admin (FACTORY_ADMIN with email) shows as "Super Admin".
 */
export const getRoleDisplayName = (
  role: string,
  email?: string | null,
  isSuperAdmin?: boolean
): string => {
  if (role === "FACTORY_ADMIN" && (isSuperAdmin || (email && email.includes("@")))) {
    return "Super Admin";
  }
  return role
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
};

/**
 * Get Tailwind classes for role-based styling
 */
export const getRoleClasses = {
  bgGradient: (role: UserRole) => `bg-gradient-to-br ${getRoleColorScheme(role).bgGradient}`,
  bgGradientLight: (role: UserRole) => `bg-gradient-to-br ${getRoleColorScheme(role).bgGradientLight}`,
  cardHeader: (role: UserRole) => `bg-gradient-to-r ${getRoleColorScheme(role).cardHeader}`,
  cardBorder: (role: UserRole) => `border-${getRoleColorScheme(role).cardBorder}`,
  buttonPrimary: (role: UserRole) => `bg-gradient-to-r ${getRoleColorScheme(role).buttonPrimary}`,
  buttonPrimaryHover: (role: UserRole) => `hover:${getRoleColorScheme(role).buttonPrimaryHover}`,
  textPrimary: (role: UserRole) => getRoleColorScheme(role).textPrimary,
  badge: (role: UserRole) => `${getRoleColorScheme(role).badgeBg} ${getRoleColorScheme(role).badgeText} ${getRoleColorScheme(role).badgeBorder}`,
};
