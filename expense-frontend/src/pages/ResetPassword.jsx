import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { BeatLoader } from "react-spinners";
import { serverEndpoint } from "../config/appConfig";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function ResetPassword() {
  const [codeLoading, setCodeLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessages] = useState({});
  const [codeSent, setCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    email: "",
    newPassword: ""
  });

  const [isDisabled, setIsDisabled] = useState(true);

  const handleGenerateCode = async () => {
    if (!formData.email) {
      setErrors({ email: "Email is required" });
      return;
    }
    try {
      setCodeLoading(true);
      await axios.post(`${serverEndpoint}/auth/generate-code`, { email: formData.email });
      setCodeSent(true);
      setErrors({});
    } catch (error) {
      setErrors({ general: "Failed to generate code. Please try again." });
    } finally {
      setCodeLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value
    });

    setErrors((prev) => ({
      ...prev,
      [name]: null,
      general: null
    }));
  };

  const handleVerifyCode = async () => {
    try {
      setCodeLoading(true);
      const { code, email } = formData;
      const res = await axios.post(`${serverEndpoint}/auth/verify-code`, { code, email });

      if (res.data.success) {
        setIsVerified(true);
        setIsDisabled(false);
        setErrors({});
      } else {
        setErrors({ code: "Invalid code entered. Try again." });
      }
    } catch (error) {
      setErrors({ code: "Invalid or expired code. Please request a new one." });
    } finally {
      setCodeLoading(false);
    }
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    const { email, newPassword } = formData;
    try {
      const res = await axios.post(`${serverEndpoint}/auth/reset-password`, { email, newPassword });

      if (res.status === 200) {
        setMessages({ general: "Password reset successful. Redirecting to login..." });
      }

      await wait(2000);
      navigate("/login");

    } catch (error) {
      setErrors({
        general: error.response?.data?.message || "Could not reset password. Try again later."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">
            Reset password
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Verify your email identity to change your password
          </p>
        </div>

        {errors.general && (
          <div className="rounded-lg bg-red-950/50 border border-red-500/30 p-3 text-center text-sm font-medium text-red-200">
            {errors.general}
          </div>
        )}

        {message.general && (
          <div className="rounded-lg bg-emerald-950/50 border border-emerald-500/30 p-3 text-center text-sm font-medium text-emerald-200">
            {message.general}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleFormSubmit}>
          <div className="space-y-4 rounded-md">
            {/* Email with Send Code button inline */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Email Address
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={codeSent}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 sm:text-sm disabled:opacity-50"
                  placeholder="Enter your email"
                />
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  disabled={codeSent || codeLoading}
                  className="flex-shrink-0 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:bg-emerald-600 disabled:opacity-100 disabled:cursor-not-allowed transition-colors"
                >
                  {codeSent ? "Sent" : codeLoading ? "Sending" : "Send Code"}
                </button>
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Code verification input */}
            {codeSent && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Verification Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    disabled={isVerified}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 sm:text-sm disabled:opacity-50"
                    placeholder="Enter the 6-digit code"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={isVerified || codeLoading}
                    className="flex-shrink-0 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:bg-emerald-600 disabled:opacity-100 disabled:cursor-not-allowed transition-colors"
                  >
                    {isVerified ? "Verified" : "Verify Code"}
                  </button>
                </div>
                {errors.code && (
                  <p className="mt-1 text-xs text-red-400">{errors.code}</p>
                )}
              </div>
            )}

            {/* New password input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                New Password
              </label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                disabled={isDisabled}
                className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 sm:text-sm disabled:opacity-30"
                placeholder="Enter new password"
              />
              {errors.newPassword && (
                <p className="mt-1 text-xs text-red-400">{errors.newPassword}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isDisabled || loading}
              className="group relative flex w-full justify-center rounded-lg border border-transparent bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <BeatLoader color="white" size={8} /> : "Reset Password"}
            </button>
          </div>

          <div className="text-center">
            <a
              href="/login"
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              Back to login
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
