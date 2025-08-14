"use client";

import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLogin, useAuth } from "@/lib/hooks/use-auth";

export default function SignInPage() {
  const router = useRouter();
  const { error, isLoading } = useAuth();
  const loginMutation = useLogin();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    // Basic validation
    if (!formData.email || !formData.password) {
      setValidationErrors({ general: "Please fill in all fields" });
      return;
    }

    if (!formData.email.includes("@")) {
      setValidationErrors({ email: "Please enter a valid email address" });
      return;
    }

    if (formData.password.length < 6) {
      setValidationErrors({
        password: "Password must be at least 6 characters long",
      });
      return;
    }

    try {
      await loginMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
      });

      // Replace current history entry and redirect to dashboard
      window.history.replaceState(null, "", "/pages/dashboard");
      router.replace("/pages/dashboard");
    } catch (err) {
      // Error is handled by the mutation
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation errors when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-2000"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/pages/welcome"
            className="inline-flex items-center gap-3 mb-6 group"
          >
            <div className="flex aspect-square size-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 text-white shadow-lg group-hover:scale-105 transition-transform duration-300">
              <Building2 className="size-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                MyCRM
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sales Platform
              </p>
            </div>
          </Link>
        </div>

        {/* Sign In Form */}
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-base text-gray-600 dark:text-gray-300">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {(error || Object.keys(validationErrors).length > 0) && (
                <Alert
                  variant="destructive"
                  className="border-red-200 bg-red-50 dark:bg-red-900/20"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error || Object.values(validationErrors)[0]}
                  </AlertDescription>
                </Alert>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    className="pl-10 pr-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) =>
                      handleInputChange("rememberMe", checked as boolean)
                    }
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor="rememberMe"
                    className="text-sm text-gray-600 dark:text-gray-300"
                  >
                    Remember me
                  </Label>
                </div>
                <Link
                  href="/pages/auth/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Don't have an account?
                </span>
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="text-center">
              <Link
                href="/pages/auth/sign-up"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
              >
                Create your account
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <Card className="mt-4 border-0 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Demo Access
                </p>
                <p className="text-blue-700 dark:text-blue-300 text-xs">
                  Use any email and password (6+ characters) to access the demo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>
            By signing in, you agree to our{" "}
            <Link
              href="#"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="#"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
