import { NavLink } from "react-router-dom";
import { useAuth } from "@/store/auth-store";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { getRoleColorScheme, getRoleDisplayName } from "@/lib/role-colors";
import {
  Users,
  Building2,
  Boxes,
  PackagePlus,
  Truck,
  Package,
  Warehouse,
  ShoppingCart,
  UserPlus,
  ArrowRightLeft,
  Wrench,
  FilePlus,
  PackageSearch,
  LayoutDashboard,
  Keyboard,
  UserCog,
  History,
  Layers,
} from "lucide-react";

type NavItem = {
  label: string;
  path: string;
  roles: string[];
  icon: React.ComponentType<{ className?: string }>;
  section: string;
  /** If true, only Super Admin (script-created) sees this item */
  superAdminOnly?: boolean;
};

/** Section order for sidebar (workflow-based). Only sections with items are shown. */
const SECTION_ORDER = [
  "OVERVIEW",
  "SETUP",
  "INVENTORY",
  "DISPATCH",
  "SALES & TRANSFER",
  "SERVICE",
  "ADMINISTRATION",
  "OPERATIONS",
  "MAIN MENU",
] as const;

const NAV_ITEMS: NavItem[] = [
  /* -------- OVERVIEW (all roles) -------- */
  { label: "Dashboard", path: "/dashboard", roles: ["FACTORY_ADMIN", "DEALER", "SUB_DEALER", "SERVICE_CENTER", "DATA_ENTRY_OPERATOR"], icon: LayoutDashboard, section: "OVERVIEW" },

  /* -------- FACTORY: Setup → Production → Inventory → Dispatch → Admin -------- */
  { label: "Create Product Model", path: "/factory/inverter-models", roles: ["FACTORY_ADMIN"], icon: Boxes, section: "SETUP" },
  { label: "Create Parts", path: "/factory/parts", roles: ["FACTORY_ADMIN"], icon: Layers, section: "SETUP" },
  { label: "Product Serial Entry", path: "/factory/inverter-registration", roles: ["FACTORY_ADMIN"], icon: PackagePlus, section: "SETUP" },
  { label: "Factory Stock", path: "/factory/stock", roles: ["FACTORY_ADMIN"], icon: Warehouse, section: "INVENTORY" },
  { label: "Product Dispatch", path: "/factory/dispatch", roles: ["FACTORY_ADMIN"], icon: Truck, section: "DISPATCH" },
  { label: "Parts Dispatch", path: "/factory/part-dispatch", roles: ["FACTORY_ADMIN"], icon: Package, section: "DISPATCH" },
  { label: "Account Creation", path: "/factory/admins", roles: ["FACTORY_ADMIN"], icon: UserCog, section: "ADMINISTRATION", superAdminOnly: true },
  { label: "Product History", path: "/lifecycle", roles: ["FACTORY_ADMIN"], icon: History, section: "INVENTORY" },

  /* -------- DEALER: Stock → Sub Dealers → Transfer → Sales -------- */
  { label: "Dealer Stock", path: "/dealer/stock", roles: ["DEALER"], icon: Warehouse, section: "INVENTORY" },
  { label: "Sub Dealers", path: "/dealer/sub-dealers", roles: ["DEALER"], icon: UserPlus, section: "SALES & TRANSFER" },
  { label: "Transfer to Sub Dealer", path: "/dealer/transfer", roles: ["DEALER"], icon: ArrowRightLeft, section: "SALES & TRANSFER" },
  { label: "Sales", path: "/dealer/sales", roles: ["DEALER"], icon: ShoppingCart, section: "SALES & TRANSFER" },

  /* -------- SUB DEALER -------- */
  { label: "My Stock", path: "/sub-dealer/stock", roles: ["SUB_DEALER"], icon: Warehouse, section: "INVENTORY" },
  { label: "Sales", path: "/sub-dealer/sales", roles: ["SUB_DEALER"], icon: ShoppingCart, section: "SALES & TRANSFER" },

  /* -------- SERVICE CENTER: Jobs → Parts Stock → History -------- */
  { label: "Service Jobs", path: "/service-center/jobs", roles: ["SERVICE_CENTER"], icon: Wrench, section: "SERVICE" },
  { label: "Create Service Job", path: "/service-center/jobs/create", roles: ["SERVICE_CENTER"], icon: FilePlus, section: "SERVICE" },
  { label: "Parts Stock", path: "/service-center/stock", roles: ["SERVICE_CENTER"], icon: PackageSearch, section: "INVENTORY" },
  { label: "Product History", path: "/lifecycle", roles: ["SERVICE_CENTER", "INSTALLER_PROGRAM_MANAGER"], icon: History, section: "INVENTORY" },

  /* -------- DATA ENTRY OPERATOR -------- */
  { label: "Product Serial Entry", path: "/operator/product-serial-entry", roles: ["DATA_ENTRY_OPERATOR"], icon: PackagePlus, section: "OPERATIONS" },
  { label: "Serial Entry", path: "/operator/serial-entry", roles: ["DATA_ENTRY_OPERATOR"], icon: Keyboard, section: "OPERATIONS" },
];


interface SidebarProps {
  onClose?: () => void;
}

const Sidebar = ({ onClose }: SidebarProps) => {
  const { user } = useAuth();

  if (!user) return null;

  const isSuperAdmin = user.isSuperAdmin ?? !!(user.email && user.email.includes("@"));
  const filteredItems = NAV_ITEMS.filter(
    (item) => item.roles.includes(user.role) && (!item.superAdminOnly || isSuperAdmin)
  );
  const itemsBySection = filteredItems.reduce<Record<string, typeof filteredItems>>((acc, item) => {
    const s = item.section || "MAIN MENU";
    if (!acc[s]) acc[s] = [];
    acc[s].push(item);
    return acc;
  }, {});
  const sectionTitles: Record<string, string> = {
    OVERVIEW: "Overview",
    SETUP: "Setup & master data",
    INVENTORY: "Inventory",
    DISPATCH: "Dispatch",
    "SALES & TRANSFER": "Sales & transfer",
    SERVICE: "Service",
    ADMINISTRATION: "Administration",
    OPERATIONS: "Operations",
    "MAIN MENU": "Main menu",
  };
  const colors = getRoleColorScheme(user.role);

  return (
    <aside className={cn(
      "w-72 border-r h-full flex flex-col shadow-sm transition-colors duration-300 bg-white dark:bg-slate-800",
      `bg-gradient-to-b ${colors.primaryLight} to-white dark:from-slate-900 dark:to-slate-800`,
      colors.accentBorder, "dark:border-slate-700"
    )}>
      {/* Header */}
      <div className={cn("p-6 border-b", colors.accentBorder, "dark:border-slate-700")}>
        <Logo size="md" className="mb-4" />
        <div className="mt-4">
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
              colors.badgeBg,
              colors.badgeText,
              colors.badgeBorder
            )}
          >
            {getRoleDisplayName(user.role, user.email, user.isSuperAdmin)}
          </span>
        </div>
      </div>

      {/* Navigation – grouped by workflow section */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {SECTION_ORDER.filter((key) => itemsBySection[key]?.length).map((sectionKey) => (
          <div key={sectionKey}>
            <h3 className="px-4 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {sectionTitles[sectionKey] ?? sectionKey.replace(/_/g, " ")}
            </h3>
            <div className="space-y-1">
              {itemsBySection[sectionKey].map((item) => {
                const Icon = item.icon;
                const isExactMatch = item.path === "/service-center/jobs";
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={isExactMatch}
                    onClick={() => {
                      if (onClose && window.innerWidth < 1024) onClose();
                    }}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? cn(colors.primary, "text-white shadow-lg")
                          : cn("text-slate-700 dark:text-slate-300", colors.primaryLight, "dark:hover:bg-slate-700/50", colors.accentText, "dark:hover:text-slate-100", "hover:opacity-80")
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={cn(
                            "h-3.5 w-3.5 flex-shrink-0",
                            isActive ? "text-white" : "text-slate-500 dark:text-slate-400"
                          )}
                        />
                        <span className="flex-1">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User – compact, no dropdown */}
      <div className={cn("p-3 border-t", colors.accentBorder, "dark:border-slate-700")}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0 text-white",
            colors.primary
          )}>
            {user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{user.name}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;