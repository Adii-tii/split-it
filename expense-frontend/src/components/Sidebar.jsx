import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";

function Sidebar({ collapsed, setCollapsed, isMobile, mobileOpen, setMobileOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.userDetails);

  const width = isMobile ? "w-56" : (collapsed ? "w-[72px]" : "w-56");
  const transformClass = isMobile 
    ? (mobileOpen ? "translate-x-0" : "-translate-x-full") 
    : "translate-x-0";

  const menuItems = [
    ["dashboard", "bi-grid", "Dashboard"],
    ["expenses", "bi-receipt", "Expenses"],
    ["groups", "bi-people", "Groups"],
    ["balances", "bi-wallet2", "Balances"],
    ["transactions", "bi-cash", "Transactions"]
  ];

  const active = location.pathname.split("/")[1] || "dashboard";

  return (
    <div
      className={`fixed top-0 bottom-0 left-0 h-screen bg-slate-950 border-r border-slate-900 flex flex-col transition-all duration-300 z-40 ${width} ${transformClass}`}
    >
      {/* ===== HEADER ===== */}
      <div className="px-4 py-3 flex items-center justify-between h-[56px] border-b border-slate-900">
        {(!collapsed || isMobile) && (
          <span className="font-extrabold text-white text-base tracking-tight select-none">
            SplitMerge
          </span>
        )}

        <button
          type="button"
          onClick={() => isMobile ? setMobileOpen(false) : setCollapsed(!collapsed)}
          className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-900 hover:text-white transition-colors"
        >
          {isMobile ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* ===== MENU ===== */}
      <ul className="flex-grow px-2 py-4 space-y-1 overflow-y-auto">
        {menuItems.map(([key, icon, label]) => {
          const isActive = active === key;

          return (
            <li key={key}>
              <button
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm ${
                  isActive 
                    ? "bg-violet-600/10 text-violet-400" 
                    : "text-slate-400 hover:bg-slate-900/50 hover:text-slate-200"
                } ${collapsed && !isMobile ? "justify-center" : "justify-start"}`}
                onClick={() => {
                  navigate(`/${key}`);
                  if (isMobile) setMobileOpen(false);
                }}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-violet-600" />
                )}

                <i className={`bi ${icon} text-lg`} />

                {(!collapsed || isMobile) && (
                  <span className="truncate">{label}</span>
                )}
              </button>
            </li>
          );
        })}

        <hr className="my-4 border-slate-900" />

        {/* ===== SETTINGS ===== */}
        <li>
          <button
            className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm ${
              active === "settings" 
                ? "bg-violet-600/10 text-violet-400" 
                : "text-slate-400 hover:bg-slate-900/50 hover:text-slate-200"
            } ${collapsed && !isMobile ? "justify-center" : "justify-start"}`}
            onClick={() => {
              navigate("/settings");
              if (isMobile) setMobileOpen(false);
            }}
          >
            {active === "settings" && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-violet-600" />
            )}

            <i className="bi bi-gear text-lg" />

            {(!collapsed || isMobile) && (
              <span className="truncate">Settings</span>
            )}
          </button>
        </li>
      </ul>

      {/* ===== USER INFO FOOTER ===== */}
      <div className="p-4 border-t border-slate-900 flex items-center gap-3 select-none">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/10 text-sm font-bold text-violet-400 flex-shrink-0">
          {user?.username?.[0]?.toUpperCase() || "U"}
        </div>

        {(!collapsed || isMobile) && (
          <div className="min-w-0 flex-grow">
            <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
