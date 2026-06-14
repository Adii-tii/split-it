import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { serverEndpoint } from "../config/appConfig.js";

function Login({ refreshAuth }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const [errors, setErrors] = useState({});
  const [message, setMessages] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setErrors((prev) => ({ ...prev, [name]: null, general: null }));
  };

  const hasPassword = async () => {
    try {
      const res = await axios.post(`${serverEndpoint}/auth/valid-login`, { email: formData.email });
      return res.data.hasPassword; // if true, user has a password
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return True; // Fallback to standard login to trigger standard user validation error
      }
      throw error;
    }
  };

  const validate = async () => {
    let newErrors = {};
    let isValid = true;

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
      isValid = false;
    }

    if (isValid) {
      try {
        const userHasPassword = await hasPassword();
        if (!userHasPassword) {
          newErrors.general = "Please log in using Google SSO";
          isValid = false;
        }
      } catch (err) {
        // network/server issue
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    try {
      const isValid = await validate();
      if (!isValid) return;

      const body = {
        email: formData.email,
        password: formData.password
      };

      const res = await axios.post(`${serverEndpoint}/auth/login`, body);
      const { token, refreshToken } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("refreshToken", refreshToken);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      setMessages({ login: "Successfully logged in!" });
      await refreshAuth();
      navigate('/dashboard');

    } catch (error) {
      if (error.response) {
        const data = error.response.data;
        if (data.errors && Array.isArray(data.errors)) {
          const fieldErrors = {};
          data.errors.forEach((err) => {
            fieldErrors[err.path || err.param] = err.msg;
          });
          setErrors(fieldErrors);
        } else {
          setErrors({ general: data.message || "An error occurred during login." });
        }
      } else {
        setErrors({ general: "Network error. Please try again." });
      }
    }
  };

  const handleGoogleSuccess = async (authResponse) => {
    try {
      const idToken = authResponse.credential;
      const res = await axios.post(`${serverEndpoint}/auth/google-auth`, { idToken });
      const { token, refreshToken } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("refreshToken", refreshToken);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      setMessages({ login: "Successfully logged in!" });
      await refreshAuth();
      navigate('/dashboard');
    } catch (error) {
      setErrors({ general: "Google SSO authentication failed." });
    }
  };

  const handleGoogleFailure = (error) => {
    console.error("Google authentication failed", error);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">
            Welcome back
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Log in to manage your shared expenses
          </p>
        </div>

        {errors.general && (
          <div className="rounded-lg bg-red-950/50 border border-red-500/30 p-3 text-center text-sm font-medium text-red-200">
            {errors.general}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleFormSubmit}>
          <div className="space-y-4 rounded-md">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="relative block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-white placeholder-slate-500 focus:z-10 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 sm:text-sm"
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <a
                  href="/reset-password"
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="relative block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-white placeholder-slate-500 focus:z-10 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 sm:text-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative flex w-full justify-center rounded-lg border border-transparent bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors"
            >
              Log in
            </button>
          </div>

          {message.login && (
            <p className="text-center text-sm font-medium text-emerald-400">
              {message.login}
            </p>
          )}
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-3 font-semibold text-slate-500">
              or
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-full flex justify-center">
            <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleFailure} theme="filled_dark" />
            </GoogleOAuthProvider>
          </div>

          <p className="text-center text-sm text-slate-400 mt-4">
            Don't have an account?{" "}
            <a
              href="/register"
              className="font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              Register
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
