import { Route, Routes, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { BeatLoader } from "react-spinners";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Groups from "./pages/Groups";
import UserLayout from "./components/UserLayout";
import { serverEndpoint } from "./config/appConfig.js";
import { setUser, clearUser } from "./store.js";

// Placeholder components for routing targets
function Dashboard() {
  const user = useSelector((state) => state.userDetails);
  
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-2">Welcome, {user?.username}!</h1>
        <p className="text-sm text-slate-400 mb-6">Manage, split, and settle group bills seamlessly.</p>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-950 p-4 border border-slate-800/80">
            <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">Your Account</p>
            <p className="text-sm font-medium text-slate-300"><span className="text-slate-400">Email:</span> {user?.email}</p>
            <p className="text-sm font-medium text-slate-300"><span className="text-slate-400">Role:</span> {user?.role || "Viewer"}</p>
          </div>
          
          <div className="rounded-xl bg-slate-950 p-4 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">Available Credits</p>
              <p className="text-2xl font-black text-yellow-500">{user?.credits !== undefined ? user.credits : 0}</p>
            </div>
            <p className="text-[10px] text-slate-500">Credits are required to create new groups.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Home() {
  return <Navigate to="/dashboard" />;
}

function App() {
  const dispatch = useDispatch();
  const userDetails = useSelector((state) => state.userDetails);
  const [loading, setLoading] = useState(true);

  const getUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      dispatch(clearUser());
      setLoading(false);
      return;
    }

    // Set global Axios auth header
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    try {
      const res = await axios.get(`${serverEndpoint}/auth/get-user`);
      if (res.data && res.data.user) {
        dispatch(setUser(res.data.user));
      }
    } catch (error) {
      console.log("No authenticated session found.");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      delete axios.defaults.headers.common["Authorization"];
      dispatch(clearUser());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUser();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <BeatLoader color="#7C6CF2" size={15} />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          userDetails ? <Navigate to="/dashboard" /> : <Login refreshAuth={getUser} />
        }
      />
      <Route
        path="/register"
        element={
          userDetails ? <Navigate to="/dashboard" /> : <Register refreshAuth={getUser} />
        }
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/dashboard"
        element={
          userDetails ? (
            <UserLayout>
              <Dashboard />
            </UserLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/groups"
        element={
          userDetails ? (
            <UserLayout>
              <Groups />
            </UserLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route path="/" element={<Home />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
