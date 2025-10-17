"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2,
  Lock,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Shield,
  Loader2,
} from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

 
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

 
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
  }>({});

 
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

 
  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
      setIsValidating(false);
      return;
    }

    validateToken();
  }, [token]);

 
  useEffect(() => {
    setPasswordStrength({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [password]);

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/auth/reset-password?token=${token}`, {
        method: "GET",
      });

      const data = await response.json();

      if (data.success) {
        setTokenValid(true);
        setUserInfo(data.user || {});
      } else {
        setError(data.error || "Invalid or expired reset token.");
      }
    } catch (err) {
      console.error("Token validation error:", err);
      setError("Failed to validate reset token. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

   
    if (!password) {
      setError("Please enter a new password");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    const allRequirementsMet = Object.values(passwordStrength).every(Boolean);
    if (!allRequirementsMet) {
      setError("Please ensure your password meets all requirements");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
       
        setTimeout(() => {
          router.replace("/pages/auth/sign-in");
        }, 3000);
      } else {
        setError(data.error || "Failed to reset password. Please try again.");
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (error) setError("");
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (error) setError("");
  };

 
  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 flex items-center justify-center p-4">
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600 dark:text-gray-300">
              Validating reset token...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

 
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 flex items-center justify-center p-4">
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Password Reset Successfully!
            </h2>

            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your password has been updated. You will be redirected to the
              login page shortly.
            </p>

            <Button
              onClick={() => router.replace("/pages/auth/sign-in")}
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

 
  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-red-900 flex items-center justify-center p-4">
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Invalid Reset Link
            </h2>

            <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>

            <div className="space-y-3">
              <Button
                onClick={() => router.replace("/pages/auth/forgot-password")}
                className="w-full"
              >
                Request New Reset Link
              </Button>

              <Button
                variant="outline"
                onClick={() => router.replace("/pages/auth/sign-in")}
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

 
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 flex items-center justify-center p-4">
      {}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-xl"></div>
        <div className="absolute top-1/3 -left-8 w-32 h-32 bg-indigo-100 dark:bg-indigo-900/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-20 h-20 bg-purple-100 dark:bg-purple-900/20 rounded-full blur-xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              CRM System
            </h1>
          </div>

          <Link
            href="/pages/auth/sign-in"
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>

        {}
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Set New Password
            </CardTitle>
            <CardDescription className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
              {userInfo.firstName && userInfo.lastName
                ? `Hello ${userInfo.firstName} ${userInfo.lastName}, create a new secure password for your account.`
                : "Create a new secure password for your account."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert
                  variant="destructive"
                  className="border-red-200 bg-red-50 dark:bg-red-900/20"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-900 dark:text-white"
                >
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {}
              {password && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Password Requirements
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div
                      className={`flex items-center gap-2 ${
                        passwordStrength.length
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          passwordStrength.length
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      />
                      8+ characters
                    </div>
                    <div
                      className={`flex items-center gap-2 ${
                        passwordStrength.uppercase
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          passwordStrength.uppercase
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      />
                      Uppercase letter
                    </div>
                    <div
                      className={`flex items-center gap-2 ${
                        passwordStrength.lowercase
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          passwordStrength.lowercase
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      />
                      Lowercase letter
                    </div>
                    <div
                      className={`flex items-center gap-2 ${
                        passwordStrength.number
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          passwordStrength.number
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      />
                      Number
                    </div>
                  </div>
                </div>
              )}

              {}
              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium text-gray-900 dark:text-white"
                >
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) =>
                      handleConfirmPasswordChange(e.target.value)
                    }
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {}
              {confirmPassword && (
                <div
                  className={`flex items-center gap-2 text-sm ${
                    password === confirmPassword
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      password === confirmPassword
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  />
                  {password === confirmPassword
                    ? "Passwords match"
                    : "Passwords do not match"}
                </div>
              )}

              {}
              <Button
                type="submit"
                disabled={isLoading || !password || !confirmPassword}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Remembered your password?{" "}
            <Link
              href="/pages/auth/sign-in"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
