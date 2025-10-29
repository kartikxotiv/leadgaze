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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Clock,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const logo = "/image/leadgaze.png";
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

   
    if (!email) {
      setError("Please enter your email address");
      setIsLoading(false);
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    try {
     
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
      } else {
       
        if (response.status === 429) {
          setError(
            data.error || "Too many attempts. Please wait before trying again."
          );
        } else {
          setError(
            data.error || "Failed to send reset email. Please try again."
          );
        }
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };


  


  const handleInputChange = (value: string) => {
    setEmail(value);
    if (error) setError("");
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 flex items-center justify-center p-4">
        {}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-2000"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          {}
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
                  Leadgaze CRM
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sales Platform
                </p>
              </div>
            </Link>
          </div>

          {}
          <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-center">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Password Recovery
              </h2>
              <div className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed text-left space-y-3">
                <p>
                  If we found a user with email{" "}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {email}
                  </span>{" "}
                  in our system, you'll receive an email shortly.
                </p>
                <p>
                  Check your spam folder if you don't see it within a few
                  minutes.
                </p>
                <p>
                  Not sure which email you used?{" "}
                  <Link
                    href="#"
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                  >
                    Contact us
                  </Link>
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-200 text-left">
                    <p className="font-medium mb-1">
                      Reset link expires in 1 hour
                    </p>
                    <p>
                      If you don't see the email, check your spam folder or
                      request a new one.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setSuccess(false);
                    setEmail("");
                    setError("");
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Send Another Email
                </Button>
                <Link href="/pages/auth/sign-in">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 flex items-center justify-center p-4">
      {}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-2000"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {}
        <div className="text-center mb-8">
          <Link
            href="/pages/welcome"
            className="inline-flex items-center gap-3 mb-6 group"
          >

          <Image src={logo} loading="lazy" width={250} height={80} alt="Leadgaze logo" />


            {/* <div className="flex aspect-square size-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 text-white shadow-lg group-hover:scale-105 transition-transform duration-300">
              <Building2 className="size-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Leadgaze CRM
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sales Platform
              </p>
            </div> */}
          </Link>
        </div>

        {}
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Reset Your Password
            </CardTitle>
            <CardDescription className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
              Enter your email address and we'll send you a link to reset your
              password.
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
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                {/* <p className="text-xs text-gray-500 dark:text-gray-400">
                  This should be the email address associated with your Leadgaze CRM
                  account.
                </p> */}
              </div>

              {}
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-[#46a3ff] from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending reset link...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Send Reset Link
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>

            {}
            {/* <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Need help?
              </h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Make sure you're using the correct email address</li>
                <li>• Check your spam or junk folder</li>
                <li>• The reset link expires after 1 hour</li>
                <li>• Contact support if you continue having issues</li>
              </ul>
            </div> */}

            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Remember your password?
                </span>
              </div>
            </div>

            
            <div className="text-center">
              <Link
                href="/pages/auth/sign-in"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>

{/*         
        <Card className="mt-4 border-0 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                  Don't have an account?
                </p>
                <p className="text-amber-700 dark:text-amber-300">
                  <Link
                    href="/pages/auth/sign-up"
                    className="underline hover:no-underline"
                  >
                    Create your free Leadgaze CRM account
                  </Link>{" "}
                  to get started with our sales platform.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {}
        <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>
            Need immediate help?{" "}
            <Link
              href="#"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Contact Support
            </Link>
          </p>
        </div> */}
      </div>
    </div>
  );
}
