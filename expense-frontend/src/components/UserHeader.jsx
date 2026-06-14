import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { serverEndpoint } from "../config/appConfig";
import { useSelector, useDispatch } from "react-redux";
import { clearUser } from "../store";

function UserHeader({ sidebarCollapsed, isMobile, mobileOpen, setMobileOpen }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.userDetails);
  const navigate = useNavigate();

  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const sidebarWidth = isMobile ? "left-0 w-full" : (sidebarCollapsed ? "left-[72px] w-[calc(100%-72px)]" : "left-56 w-[calc(100%-224px)]");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await axios.get(`${serverEndpoint}/auth/logout`);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      delete axios.defaults.headers.common["Authorization"];
      dispatch(clearUser());
      navigate("/login");
    }
  };

  return (
    <nav
      className={`fixed top-0 right-0 h-14 flex items-center justify-between px-6 transition-all duration-300 z-35 ${sidebarWidth} ${
        scrolled 
          ? "bg-slate-950/80 border-b border-slate-900 shadow-lg backdrop-blur-md" 
          : "bg-transparent"
      }`}
    >
      <div className="flex items-center flex-grow min-w-0">
        {isMobile && (
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="mr-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-white hover:bg-slate-850 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Search Input */}
        <div className="relative flex-grow max-w-[180px] sm:max-w-[320px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search transactions..."
            className="block w-full h-9 pl-9 pr-4 rounded-full border border-slate-800 bg-slate-900/60 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
          />
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4 flex-shrink-0" ref={dropdownRef}>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 h-9 rounded-full bg-slate-900/60 border border-slate-800 pl-3 pr-2 text-white hover:border-slate-700 transition-colors focus:outline-none select-none"
          >
            <span className="hidden sm:inline text-xs font-semibold text-slate-200">
              {user?.username || "User"}
            </span>

            {/* Avatar */}
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white uppercase overflow-hidden">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                user?.username?.[0]?.toUpperCase() || "U"
              )}
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-800 bg-slate-950 p-1.5 shadow-2xl z-50">
              <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-900 mb-1">
                Signed in as <strong className="text-slate-200 font-semibold">{user?.email}</strong>
              </div>

              <Link
                to="/profile"
                onClick={() => setDropdownOpen(false)}
                className="block w-full px-3 py-2 text-left rounded-lg text-sm text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
              >
                Profile
              </Link>
              <Link
                to="/manage-users"
                onClick={() => setDropdownOpen(false)}
                className="block w-full px-3 py-2 text-left rounded-lg text-sm text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
              >
                Manage Users
              </Link>
              <Link
                to="/manage-payments"
                onClick={() => setDropdownOpen(false)}
                className="block w-full px-3 py-2 text-left rounded-lg text-sm text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
              >
                Payments
              </Link>
              <Link
                to="/manage-subscriptions"
                onClick={() => setDropdownOpen(false)}
                className="block w-full px-3 py-2 text-left rounded-lg text-sm text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
              >
                Subscriptions
              </Link>

              <div className="border-t border-slate-900 my-1" />

              <button
                type="button"
                onClick={handleLogout}
                className="block w-full px-3 py-2 text-left rounded-lg text-sm text-red-400 hover:bg-slate-900 hover:text-red-300 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default UserHeader;
