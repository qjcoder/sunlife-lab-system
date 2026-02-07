import { useAuth } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Search, Bell, MessageSquare, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { getRoleColorScheme, getRoleDisplayName } from "@/lib/role-colors";
import { useState } from "react";

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

const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  if (!user) return null;

  const colors = getRoleColorScheme(user.role);

  return (
    <header className={cn(
      "h-14 sm:h-16 border-b shadow-sm flex items-center justify-between px-3 sm:px-4 md:px-6 transition-colors duration-300",
      "bg-white dark:bg-slate-900", colors.accentBorder, "dark:border-slate-700"
    )}>
      {/* Left Side - Menu Button (Mobile) + Logo */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden h-9 w-9"
        >
          <Menu className="h-3.5 w-3.5" />
        </Button>
        
        <div className={cn(
          "w-8 h-8 sm:w-10 sm:h-10 border-2 rounded-full bg-transparent flex items-center justify-center p-1 shadow-sm",
          colors.accentBorder, "dark:border-slate-600"
        )}>
          <img 
            src="/Logo1.png" 
            alt="SunLife Solar" 
            className="h-6 w-6 sm:h-8 sm:w-8 rounded-full object-contain bg-transparent"
            style={{ backgroundColor: 'transparent' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
        <div className="hidden sm:block">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">Dashboard</h2>
        </div>
      </div>

      {/* Search Bar - Hidden on mobile */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-400" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "pl-10 w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900",
              "focus:ring-2 focus:ring-offset-0",
              user.role === "FACTORY_ADMIN" ? "focus:border-red-500 focus:ring-red-500/20" :
              user.role === "DEALER" ? "focus:border-blue-500 focus:ring-blue-500/20" :
              user.role === "SUB_DEALER" ? "focus:border-green-500 focus:ring-green-500/20" :
              "focus:border-orange-500 focus:ring-orange-500/20"
            )}
          />
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications - Hidden on mobile */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-8 w-8 sm:h-9 sm:w-9 rounded-lg transition-colors hidden sm:flex",
            colors.primaryLight, "dark:hover:bg-slate-800"
          )}
        >
          <Bell className={cn("h-3.5 w-3.5 sm:h-5 sm:w-5", colors.accentText, "dark:text-slate-400")} />
          <span className={cn(
            "absolute top-1 right-1 h-2 w-2 rounded-full border-2 border-white dark:border-slate-900",
            colors.primary
          )} />
        </Button>

        {/* Messages - Hidden on mobile */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-8 w-8 sm:h-9 sm:w-9 rounded-lg transition-colors hidden sm:flex",
            colors.primaryLight, "dark:hover:bg-slate-800"
          )}
        >
          <MessageSquare className={cn("h-3.5 w-3.5 sm:h-5 sm:w-5", colors.accentText, "dark:text-slate-400")} />
          <span className={cn(
            "absolute top-1 right-1 h-2 w-2 rounded-full border-2 border-white dark:border-slate-900",
            colors.primary
          )} />
        </Button>

        {/* User Profile */}
        <div className={cn("flex items-center gap-1 sm:gap-2 md:gap-3 pl-2 sm:pl-4 border-l", colors.accentBorder, "dark:border-slate-700")}>
          <div className={cn(
            "h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm text-white",
            colors.primary
          )}>
            {getInitials(user.name)}
          </div>
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {user.name}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {getRoleDisplayName(user.role, user.email, user.isSuperAdmin)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className={cn(
              "h-8 w-8 sm:h-9 sm:w-9 rounded-lg transition-colors",
              colors.primaryLight, colors.accentText,
              "dark:hover:bg-slate-800 dark:hover:text-red-400"
            )}
            title="Logout"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;