import { Route, Routes, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { BeatLoader } from "react-spinners";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import { serverEndpoint } from "./config/appConfig.js";
import { setUser, clearUser } from "./store.js";

// Placeholder components for routing targets
function Dashboard() {
  const user = useSelector((state) => state.userDetails);
  const dispatch = useDispatch();
  
  const handleLogout = async () => {
    try {
      await axios.get(`${serverEndpoint}/auth/logout`);
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      delete axios.defaults.headers.common["Authorization"];
      dispatch(clearUser());
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-2">Dashboard (Placeholder)</h1>
        <p className="text-slate-400 mb-6">Successfully authenticated!</p>
        
        <div className="rounded-lg bg-slate-950 p-4 border border-slate-800 text-left space-y-2 mb-6">
          <p className="text-xs text-slate-500 uppercase font-semibold">User Details</p>
          <p className="text-sm font-medium text-white"><span className="text-slate-400">Name:</span> {user?.username}</p>
          <p className="text-sm font-medium text-white"><span className="text-slate-400">Email:</span> {user?.email}</p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
        >
          Logout
        </button>
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
          userDetails ? <Dashboard /> : <Navigate to="/login" />
        }
      />
      <Route path="/" element={<Home />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
