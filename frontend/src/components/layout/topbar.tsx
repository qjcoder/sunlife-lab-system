import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, MessageSquare, Menu, ChevronDown } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { getRoleColorScheme, getRoleDisplayName } from "@/lib/role-colors";

interface TopbarProps {
  onMenuClick?: () => void;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const pathToSection: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/factory/inverter-models": "Create Product Model",
  "/factory/parts": "Create Parts",
  "/factory/inverter-registration": "Product Serial Entry",
  "/factory/stock": "Factory Stock",
  "/factory/dispatch": "Product Dispatch",
  "/factory/part-dispatch": "Parts Dispatch",
  "/factory/admins": "Account Creation",
  "/lifecycle": "Product History",
  "/dealer/stock": "Dealer Stock",
  "/dealer/sub-dealers": "Sub Dealers",
  "/dealer/transfer": "Transfer to Sub Dealer",
  "/dealer/sales": "Sales",
  "/sub-dealer/stock": "My Stock",
  "/sub-dealer/sales": "Sales",
  "/service-center/jobs": "Service Jobs",
  "/service-center/jobs/create": "Create Service Job",
  "/service-center/stock": "Parts Stock",
  "/operator/product-serial-entry": "Product Serial Entry",
  "/operator/serial-entry": "Serial Entry",
};

function getSectionTitle(pathname: string): string {
  if (pathToSection[pathname]) return pathToSection[pathname];
  for (const [path, title] of Object.entries(pathToSection)) {
    if (pathname.startsWith(path)) return title;
  }
  return "Dashboard";
}

const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) setNotificationsOpen(false);
      if (messagesRef.current && !messagesRef.current.contains(target)) setMessagesOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!user) return null;

  const colors = getRoleColorScheme(user.role);
  const sectionTitle = getSectionTitle(pathname);

  return (
    <header
      className={cn(
        "h-14 flex items-center justify-between gap-4 px-4 md:px-6 mx-3 md:mx-4 mt-3 rounded-2xl",
        "bg-white dark:bg-slate-950",
        "border border-slate-200 dark:border-slate-700/80",
        "shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-800"
      )}
    >
      {/* Left: menu (mobile) | logo + brand | divider | section */}
      <div className="flex items-center gap-3 min-w-0 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden h-9 w-9 shrink-0 text-slate-600 dark:text-slate-300"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <img
              src="/Logo1.png"
              alt="SunLife Solar"
              className="h-5 w-5 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <span className="hidden sm:inline text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
            SunLife Solar
          </span>
        </div>
        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" aria-hidden />
        <span className="hidden sm:inline text-sm font-bold text-slate-900 dark:text-slate-100 truncate min-w-0">
          {sectionTitle}
        </span>
      </div>

      {/* Right: theme, notifications, user */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <ThemeToggle />

        <div className="relative hidden sm:block" ref={notificationsRef}>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => { setNotificationsOpen((v) => !v); setMessagesOpen(false); }}
            className={cn(
              "relative h-9 w-9 rounded-lg",
              "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
            aria-expanded={notificationsOpen}
            aria-haspopup="true"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 dark:bg-red-400 ring-2 ring-white dark:ring-slate-950" />
          </Button>
          {notificationsOpen && (
            <div
              className={cn(
                "absolute right-0 top-full mt-1 w-72 rounded-xl border py-2 z-50",
                "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-lg"
              )}
            >
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</p>
              </div>
              <div className="px-3 py-6 text-center">
                <Bell className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No new notifications</p>
              </div>
            </div>
          )}
        </div>

        <div className="relative hidden sm:block" ref={messagesRef}>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => { setMessagesOpen((v) => !v); setNotificationsOpen(false); }}
            className={cn(
              "relative h-9 w-9 rounded-lg",
              "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
            aria-expanded={messagesOpen}
            aria-haspopup="true"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 dark:bg-red-400 ring-2 ring-white dark:ring-slate-950" />
          </Button>
          {messagesOpen && (
            <div
              className={cn(
                "absolute right-0 top-full mt-1 w-72 rounded-xl border py-2 z-50",
                "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-lg"
              )}
            >
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Messages</p>
              </div>
              <div className="px-3 py-6 text-center">
                <MessageSquare className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No new messages</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pl-1">
          <div className={cn(
            "h-9 w-9 rounded-full flex items-center justify-center font-semibold text-sm text-white shrink-0 ring-2 ring-white/20 dark:ring-slate-800",
            colors.primary
          )}>
            {getInitials(user.name)}
          </div>
          <div className="hidden md:block text-left min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[100px]">
              {getRoleDisplayName(user.role, user.email, user.isSuperAdmin)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[100px]">
              {user.name}
            </p>
          </div>
          <ChevronDown className="hidden md:block h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="h-9 w-9 shrink-0 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;