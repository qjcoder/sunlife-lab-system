import { useAuth } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Mail, Search, Bell, MessageSquare, ChevronDown } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { useState } from "react";

const formatRoleName = (role: string) => {
  return role
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const Topbar = () => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  if (!user) return null;

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between px-6">
      {/* Left Side - Logo1 */}
      <div className="flex items-center gap-3 mr-6">
        <div className="w-10 h-10 border-2 border-red-600 dark:border-red-500 rounded-full bg-transparent flex items-center justify-center p-1 shadow-sm">
          <img 
            src="/Logo1.png" 
            alt="SunLife Solar" 
            className="h-8 w-8 rounded-full object-contain bg-transparent"
            style={{ backgroundColor: 'transparent' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
        <div className="hidden md:block">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Dashboard</h2>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900"
          />
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
        </Button>

        {/* Messages */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <MessageSquare className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900" />
        </Button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
          <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
            {getInitials(user.name)}
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {user.name}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatRoleName(user.role)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="h-9 w-9 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
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