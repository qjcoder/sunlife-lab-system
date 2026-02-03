import { NavLink } from "react-router-dom";
import { useAuth } from "@/store/auth-store";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import {
  Users,
  Building2,
  Network,
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
  ChevronDown,
  LayoutDashboard,
} from "lucide-react";

type NavItem = {
  label: string;
  path: string;
  roles: string[];
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
};

const NAV_ITEMS: NavItem[] = [
  /* -------- COMMON -------- */
  { label: "Dashboard", path: "/dashboard", roles: ["FACTORY_ADMIN", "DEALER", "SUB_DEALER", "SERVICE_CENTER"], icon: LayoutDashboard, section: "MAIN MENU" },

  /* -------- FACTORY -------- */
  { label: "Inverter Models", path: "/factory/inverter-models", roles: ["FACTORY_ADMIN"], icon: Boxes, section: "MAIN MENU" },
  { label: "Inverter Registration", path: "/factory/inverter-registration", roles: ["FACTORY_ADMIN"], icon: PackagePlus, section: "MAIN MENU" },
  { label: "Factory Stock", path: "/factory/stock", roles: ["FACTORY_ADMIN"], icon: Warehouse, section: "MAIN MENU" },
  { label: "Dispatch", path: "/factory/dispatch", roles: ["FACTORY_ADMIN"], icon: Truck, section: "MAIN MENU" },
  { label: "Dealers", path: "/factory/dealers", roles: ["FACTORY_ADMIN"], icon: Users, section: "MAIN MENU" },
  { label: "Service Centers", path: "/factory/service-centers", roles: ["FACTORY_ADMIN"], icon: Building2, section: "MAIN MENU" },
  { label: "Part Dispatch", path: "/factory/part-dispatch", roles: ["FACTORY_ADMIN"], icon: Package, section: "MAIN MENU" },
  { label: "Dealer Hierarchy", path: "/factory/dealer-hierarchy", roles: ["FACTORY_ADMIN"], icon: Network, section: "MAIN MENU" },

  /* -------- DEALER -------- */
  { label: "Dealer Stock", path: "/dealer/stock", roles: ["DEALER"], icon: Warehouse, section: "MAIN MENU" },
  { label: "Sub Dealers", path: "/dealer/sub-dealers", roles: ["DEALER"], icon: UserPlus, section: "MAIN MENU" },
  { label: "Transfer to Sub Dealer", path: "/dealer/transfer", roles: ["DEALER"], icon: ArrowRightLeft, section: "MAIN MENU" },
  { label: "Sales", path: "/dealer/sales", roles: ["DEALER"], icon: ShoppingCart, section: "MAIN MENU" },

  /* -------- SUB DEALER -------- */
  { label: "My Stock", path: "/sub-dealer/stock", roles: ["SUB_DEALER"], icon: Warehouse, section: "MAIN MENU" },
  { label: "Sales", path: "/sub-dealer/sales", roles: ["SUB_DEALER"], icon: ShoppingCart, section: "MAIN MENU" },

  /* -------- SERVICE CENTER -------- */
  { label: "Service Jobs", path: "/service-center/jobs", roles: ["SERVICE_CENTER"], icon: Wrench, section: "MAIN MENU" },
  { label: "Create Service Job", path: "/service-center/jobs/create", roles: ["SERVICE_CENTER"], icon: FilePlus, section: "MAIN MENU" },
  { label: "Parts Stock", path: "/service-center/stock", roles: ["SERVICE_CENTER"], icon: PackageSearch, section: "MAIN MENU" },
];

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case "FACTORY_ADMIN":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800";
    case "DEALER":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800";
    case "SUB_DEALER":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800";
    case "SERVICE_CENTER":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800";
    default:
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800";
  }
};

const formatRoleName = (role: string) => {
  return role
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
};

const Sidebar = () => {
  const { user } = useAuth();

  if (!user) return null;

  const filteredItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <aside className="w-72 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border-r border-slate-200 dark:border-slate-700 h-full flex flex-col shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <Logo size="md" className="mb-4" />
        <div className="mt-4">
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
              getRoleBadgeColor(user.role)
            )}
          >
            {formatRoleName(user.role)}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="px-4 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            MAIN MENU
          </h3>
          <div className="space-y-1">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              // For "Service Jobs", only highlight if we're exactly on that path (not on create or details)
              const isExactMatch = item.path === "/service-center/jobs";
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={isExactMatch}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-100"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={cn(
                          "h-5 w-5 flex-shrink-0",
                          isActive ? "text-primary-foreground" : "text-slate-500 dark:text-slate-400"
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
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
          <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm flex-shrink-0">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
              {user.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {user.email}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;