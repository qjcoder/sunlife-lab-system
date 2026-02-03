import { Outlet } from "react-router-dom";
import Sidebar from "./sidebar";
import Topbar from "./topbar";

const AppShell = () => {
  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />

        <main className="flex-1 overflow-auto p-6 bg-white dark:bg-slate-900">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;