"use client";

import { useState, useEffect } from "react";
import useAuthStore from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { Lock, Mail, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const authError = useAuthStore((state) => state.error);
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);

  const router = useRouter();

  // Redirect authenticated users away from login page
  useEffect(() => {
    if (_hasHydrated && isInitialized && user) {
      if (user.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, isInitialized, _hasHydrated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    const user = await login(email, password);

    if (user) {
      setSuccessMsg("Login successful! Redirecting...");

      // Short delay to show success message
      setTimeout(() => {
        if (user.role === "admin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/dashboard");
        }
      }, 1000);
    } else {
      setError(authError || "Failed to login. Please check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white   px-4">
      <div className="max-w-md w-full bg-white border-[1.5px] border-gray-200 rounded-none shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900  mb-2">
            Raidware
          </h1>
          <p className="text-gray-600 ">
            Cloud IoT Security Platform
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50  border border-red-200  rounded-none p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600  shrink-0" />
              <p className="text-sm text-red-600 ">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50  border border-green-200  rounded-none p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600  shrink-0" />
              <p className="text-sm text-green-600 ">
                {successMsg}
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700  mb-2"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border-[1.5px] border-gray-300  rounded-none focus:ring-0 focus:border-black bg-white  text-gray-900 "
                placeholder="admin@warehouse.com"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700  mb-2"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border-[1.5px] border-gray-300  rounded-none focus:ring-0 focus:border-black bg-white  text-gray-900 "
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white hover:bg-gray-800 border border-transparent text-white font-semibold py-3 px-4 rounded-none transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600 ">
            Don't have an account?{" "}
            <a
              href="/signup"
              className="text-indigo-600  hover:underline font-medium"
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
