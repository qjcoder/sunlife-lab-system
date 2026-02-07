import { useState, useRef, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./sidebar";
import Topbar from "./topbar";
import { cn } from "@/lib/utils";

const AppShell = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const isInverterModels = location.pathname.includes("inverter-models");
  // Pages that use full-height card layout (scroll inside page, not main)
  const isFullHeightPage =
    isInverterModels ||
    location.pathname.includes("factory/parts") ||
    location.pathname.includes("factory/stock") ||
    location.pathname.includes("part-dispatch") ||
    location.pathname.includes("factory/dispatch") ||
    location.pathname.includes("lifecycle") ||
    location.pathname.includes("inverter-registration") ||
    location.pathname.includes("operator/product-serial-entry");

  // Scroll main content to top when navigating to a new page
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex h-screen max-h-screen overflow-hidden w-full bg-slate-50 dark:bg-[#0c0e12]">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden w-full lg:w-auto">
        <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main
          ref={mainRef}
          className={cn(
            "flex-1 min-h-0 flex flex-col p-3 sm:p-4 md:p-6 bg-white dark:bg-slate-900/95 dark:border-l dark:border-slate-800/80",
            isFullHeightPage ? "overflow-hidden" : "overflow-auto"
          )}
        >
          <div
            className={cn(
              "max-w-7xl mx-auto w-full h-full min-h-0 flex flex-col",
              isFullHeightPage && "overflow-hidden"
            )}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;