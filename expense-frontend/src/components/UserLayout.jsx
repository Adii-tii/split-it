import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import UserHeader from "./UserHeader";

function UserLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sidebarWidthClass = isMobile 
    ? "pl-4 pr-4" 
    : (sidebarCollapsed ? "pl-[94px] pr-6" : "pl-[248px] pr-6");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <UserHeader
        sidebarCollapsed={sidebarCollapsed}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Mobile Backdrop Overlay */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content wrapper */}
      <main
        className={`pt-20 pb-8 min-h-screen transition-all duration-300 ${sidebarWidthClass}`}
      >
        {children}
      </main>
    </div>
  );
}

export default UserLayout;
