"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useRegister } from "@/lib/hooks/use-auth";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Target,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function SignUpPage() {
  const router = useRouter();
  const { user, error, isLoading } = useAuth();
  const registerMutation = useRegister();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSliding, setIsSliding] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"forward" | "backward">(
    "forward"
  );
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    accountName: "",
    whatBringsYou: "",
    currentRole: "",
    teamSize: "",
    companySize: "",
    agreeToTerms: false,
    subscribeNewsletter: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);

  // OTP verification state
  const [showOTPStep, setShowOTPStep] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpCanRetry, setOtpCanRetry] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [resendAvailableIn, setResendAvailableIn] = useState(0);
  const [otpSentAt, setOtpSentAt] = useState<Date | null>(null);

  const totalSteps = 6; // Email, account details, and setup questions

  // Timer effect for OTP expiration and resend availability
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (otpExpiresAt && otpSentAt && otpSent && !otpVerified) {
      interval = setInterval(() => {
        const now = new Date();

        // OTP expiration timer (from backend)
        const timeLeft = Math.max(
          0,
          Math.ceil((otpExpiresAt.getTime() - now.getTime()) / 1000)
        );
        setRemainingTime(timeLeft);

        // Resend button timer (60 seconds from when OTP was sent)
        const resendTimeLeft = Math.max(
          0,
          60 - Math.ceil((now.getTime() - otpSentAt.getTime()) / 1000)
        );
        setResendAvailableIn(resendTimeLeft);

        // Enable retry when 60 seconds have passed (not when OTP expires)
        if (resendTimeLeft === 0) {
          setOtpCanRetry(true);
        }
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [otpExpiresAt, otpSentAt, otpSent, otpVerified]);

  // Function to check if email already exists
  const checkEmailAvailability = async (email: string) => {
    setEmailCheckLoading(true);
    setValidationErrors({});

    try {
      const response = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setEmailExists(data.exists);
        setEmailChecked(true);

        if (data.exists) {
          setValidationErrors({
            email:
              "An account with this email already exists. Please use a different email or sign in instead.",
          });
          return false;
        }
        return true;
      } else {
        setValidationErrors({ email: "Failed to check email availability" });
        return false;
      }
    } catch (error) {
      setValidationErrors({ email: "Failed to check email availability" });
      return false;
    } finally {
      setEmailCheckLoading(false);
    }
  };

  // Function to send OTP
  const sendOTP = async (email: string) => {
    setOtpSending(true);
    setOtpError("");

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, purpose: "signup" }),
      });

      const data = await response.json();

      if (data.success) {
        setOtpSent(true);
        setShowOTPStep(true);
        setOtpCanRetry(false);

        // Set expiration time (from backend)
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + data.expiresIn);
        setOtpExpiresAt(expiresAt);
        setRemainingTime(data.expiresIn);

        // Track when OTP was sent for 60-second resend timer
        const sentAt = new Date();
        setOtpSentAt(sentAt);
        setResendAvailableIn(60);

        return true;
      } else {
        setOtpError(data.error || "Failed to send verification code");
        setOtpCanRetry(data.canRetryIn ? false : true);
        return false;
      }
    } catch (error) {
      setOtpError("Failed to send verification code");
      setOtpCanRetry(true);
      return false;
    } finally {
      setOtpSending(false);
    }
  };

  // Function to verify OTP
  const verifyOTP = async (email: string, otp: string) => {
    setOtpVerifying(true);
    setOtpError("");

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp, purpose: "signup" }),
      });

      const data = await response.json();

      if (data.success) {
        setOtpVerified(true);
        setRemainingTime(0);
        setOtpCanRetry(false);
        setResendAvailableIn(0);
        setOtpSentAt(null);
        return true;
      } else {
        setOtpError(data.error || "Invalid verification code");

        if (data.expired || data.tooManyAttempts) {
          setOtpCanRetry(true);
          setOtpSent(false);
          setRemainingTime(0);
          setResendAvailableIn(0);
          setOtpSentAt(null);
        }

        return false;
      }
    } catch (error) {
      setOtpError("Failed to verify code");
      return false;
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleNext = async () => {
    setValidationErrors({});

    // Step-specific validation
    if (currentStep === 1) {
      if (!showOTPStep) {
        // Step 1A: Email validation and OTP sending
        if (!formData.email) {
          setValidationErrors({ email: "Please enter your email address" });
          return;
        }
        if (!formData.email.includes("@") || !formData.email.includes(".")) {
          setValidationErrors({ email: "Please enter a valid email address" });
          return;
        }

        // Check email availability before proceeding
        const emailAvailable = await checkEmailAvailability(formData.email);
        if (!emailAvailable) {
          return; // Email exists or error occurred
        }

        // Send OTP
        const otpSent = await sendOTP(formData.email);
        if (!otpSent) {
          return; // OTP sending failed
        }

        // Don't advance step, just show OTP verification UI
        return;
      } else {
        // Step 1B: OTP verification
        if (!otpValue) {
          setOtpError("Please enter the verification code");
          return;
        }
        if (!/^\d{6}$/.test(otpValue)) {
          setOtpError("Please enter a valid 6-digit code");
          return;
        }

        // Verify OTP
        const otpValid = await verifyOTP(formData.email, otpValue);
        if (!otpValid) {
          return; // OTP verification failed
        }

        // OTP verified, proceed to step 2
      }
    }

    if (currentStep === 2) {
      if (
        !formData.firstName ||
        !formData.lastName ||
        !formData.password ||
        !formData.confirmPassword ||
        !formData.accountName
      ) {
        setValidationErrors({ general: "Please fill in all required fields" });
        return;
      }
      if (formData.password.length < 8) {
        setValidationErrors({
          password: "Password must be at least 8 characters long",
        });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setValidationErrors({ confirmPassword: "Passwords do not match" });
        return;
      }
    }

    if (currentStep === 3) {
      if (!formData.whatBringsYou) {
        setValidationErrors({
          general: "Please select what brings you here",
        });
        return;
      }
    }

    if (currentStep === 4 && !formData.currentRole) {
      setValidationErrors({
        general: "Please select your current role",
      });
      return;
    }

    if (currentStep === 5 && !formData.teamSize) {
      setValidationErrors({
        general: "Please select your team size",
      });
      return;
    }

    if (currentStep < totalSteps) {
      setIsSliding(true);
      setSlideDirection("forward");
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsSliding(false);
      }, 300);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setIsSliding(true);
      setSlideDirection("backward");
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsSliding(false);
      }, 300);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNext();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setValidationErrors({}); // Clear validation errors

    // Final validation for step 6
    if (!formData.agreeToTerms) {
      setValidationErrors({
        terms: "Please agree to the Terms of Service and Privacy Policy",
      });
      return;
    }

    if (!formData.companySize) {
      setValidationErrors({
        general: "Please select your company size",
      });
      return;
    }

    try {
      await registerMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        organizationName: formData.accountName,
        // Include setup questions as metadata
        setupQuestions: {
          whatBringsYou: formData.whatBringsYou,
          currentRole: formData.currentRole,
          teamSize: formData.teamSize,
          companySize: formData.companySize,
        },
      });

      setSuccess(true);

      // Show success message briefly, then redirect
      setTimeout(() => {
        router.replace("/pages/dashboard");
      }, 1500);
    } catch (err) {
      // Error is handled by the mutation (useAuth store)
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Reset email check status when email changes
    if (field === "email") {
      setEmailChecked(false);
      setEmailExists(false);
      // Reset OTP state when email changes
      setShowOTPStep(false);
      setOtpSent(false);
      setOtpValue("");
      setOtpVerified(false);
      setOtpError("");
      setOtpCanRetry(false);
      setOtpExpiresAt(null);
      setOtpSentAt(null);
      setRemainingTime(0);
      setResendAvailableIn(0);
    }

    // Clear validation errors when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle OTP input
  const handleOTPChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const numericValue = value.replace(/\D/g, "").slice(0, 6);
    setOtpValue(numericValue);
    setOtpError(""); // Clear error when user types
  };

  // Early return for success state
  if (success) {
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

          {/* Success Card */}
          <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-center">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Account Created Successfully!
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Your account and organization have been created successfully.
                You'll be redirected to your dashboard in a moment.
              </p>
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  Redirecting...
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return showOTPStep ? renderOTPStep() : renderEmailStep();
      case 2:
        return renderAccountDetailsStep();
      case 3:
        return renderWhatBringsYouStep();
      case 4:
        return renderCurrentRoleStep();
      case 5:
        return renderTeamSizeStep();
      case 6:
        return renderCompanySizeStep();
      default:
        return renderEmailStep();
    }
  };

  const renderEmailStep = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Get Started
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Create your account to start managing your sales pipeline
        </p>
      </div>

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
            placeholder="Enter your email address"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            onKeyPress={handleKeyPress}
            className={`pl-10 pr-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${
              emailChecked && !emailExists ? "border-green-500" : ""
            } ${emailExists ? "border-red-500" : ""}`}
            disabled={isLoading || emailCheckLoading}
          />
          {/* Email check status indicator */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {emailCheckLoading && (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            )}
            {emailChecked && !emailExists && !emailCheckLoading && (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
            {emailExists && !emailCheckLoading && (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
          </div>
        </div>

        {/* Email validation messages */}
        {validationErrors.email && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {validationErrors.email}
            {emailExists && (
              <Link
                href="/pages/auth/sign-in"
                className="text-blue-600 hover:text-blue-800 underline ml-1"
              >
                Sign in instead
              </Link>
            )}
          </p>
        )}

        {emailChecked && !emailExists && !validationErrors.email && (
          <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Great! This email is available
          </p>
        )}
      </div>
    </div>
  );

  const renderOTPStep = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Verify Your Email
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          We've sent a 6-digit verification code to
        </p>
        <p className="text-blue-600 font-medium mt-1">{formData.email}</p>
      </div>

      {/* OTP Input */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="otp" className="text-sm font-medium">
            Verification Code
          </Label>
          <Input
            id="otp"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={otpValue}
            onChange={(e) => handleOTPChange(e.target.value)}
            className="text-center text-2xl tracking-widest font-mono h-16 text-blue-600"
            disabled={otpVerifying}
            autoComplete="one-time-code"
          />
          {otpError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {otpError}
            </p>
          )}
          {otpVerified && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Email verified successfully!
            </p>
          )}
        </div>

        {/* Resend OTP */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            Didn't receive the code?
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => sendOTP(formData.email)}
            disabled={otpSending || (!otpCanRetry && resendAvailableIn > 0)}
            className="text-sm"
          >
            {otpSending ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Sending...
              </div>
            ) : resendAvailableIn > 0 && !otpCanRetry ? (
              `Resend in ${resendAvailableIn}s`
            ) : (
              "Resend Code"
            )}
          </Button>
        </div>

        {/* Simple expiry message */}
        {otpExpiresAt && remainingTime > 0 && (
          <div className="text-center">
            <p className="text-xs text-gray-500">Code expires in 10 minutes</p>
          </div>
        )}

        {remainingTime === 0 && otpExpiresAt && (
          <div className="text-center">
            <p className="text-xs text-red-500">
              Code has expired. Please request a new one.
            </p>
          </div>
        )}
      </div>

      {/* Back to email step */}
      <div className="text-center">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setShowOTPStep(false);
            setOtpSent(false);
            setOtpValue("");
            setOtpError("");
            setOtpCanRetry(false);
            setOtpExpiresAt(null);
            setOtpSentAt(null);
            setRemainingTime(0);
            setResendAvailableIn(0);
          }}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          ← Change Email Address
        </Button>
      </div>
    </div>
  );

  const renderAccountDetailsStep = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Create Your Account
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Set up your account and organization details
        </p>
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-sm font-medium">
            First Name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="firstName"
              type="text"
              placeholder="First name"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-sm font-medium">
            Last Name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="lastName"
              type="text"
              placeholder="Last name"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Password Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
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
          {validationErrors.password && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {validationErrors.password}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) =>
                handleInputChange("confirmPassword", e.target.value)
              }
              className="pl-10 pr-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {validationErrors.confirmPassword && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {validationErrors.confirmPassword}
            </p>
          )}
        </div>
      </div>

      {/* Account Name */}
      <div className="space-y-2">
        <Label htmlFor="accountName" className="text-sm font-medium">
          Account Name *
        </Label>
        <div className="relative">
          <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="accountName"
            type="text"
            placeholder="Acme Corp or Sales Team"
            value={formData.accountName}
            onChange={(e) => handleInputChange("accountName", e.target.value)}
            className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );

  const renderWhatBringsYouStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-purple-100 dark:bg-purple-900/30 rounded-full animate-pulse"></div>
          <Target className="relative w-12 h-12 text-purple-600 mx-auto mb-4 animate-bounce-gentle" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          What brings you here today?
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          This helps us personalize your CRM experience
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          {
            value: "lead-management",
            label: "Lead Management",
            emoji: "🎯",
          },
          {
            value: "customer-relationships",
            label: "Customer Relations",
            emoji: "🤝",
          },
          {
            value: "sales-pipeline",
            label: "Sales Pipeline",
            emoji: "📈",
          },
          {
            value: "team-collaboration",
            label: "Team Collaboration",
            emoji: "👥",
          },
          {
            value: "all-above",
            label: "All of the Above",
            emoji: "🚀",
          },
        ].map((option, index) => (
          <div
            key={option.value}
            onClick={() => handleInputChange("whatBringsYou", option.value)}
            className={`group p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:border-purple-300 hover:shadow-md hover:scale-[1.02] transform text-center ${
              formData.whatBringsYou === option.value
                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md scale-[1.02]"
                : "border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex flex-col items-center space-y-2">
              <div className="text-2xl">{option.emoji}</div>
              <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                {option.label}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCurrentRoleStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-full animate-pulse"></div>
          <Briefcase className="relative w-12 h-12 text-blue-600 mx-auto mb-4 animate-bounce-gentle" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          What best describes your current role?
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          This helps us customize your experience
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { value: "sales-rep", label: "Sales Representative" },
          { value: "sales-manager", label: "Sales Manager" },
          { value: "sales-director", label: "Sales Director" },
          { value: "account-manager", label: "Account Manager" },
          { value: "business-development", label: "Business Development" },
          { value: "marketing", label: "Marketing" },
          { value: "ceo", label: "CEO/Founder" },
          { value: "other", label: "Other" },
        ].map((option, index) => (
          <div
            key={option.value}
            onClick={() => handleInputChange("currentRole", option.value)}
            className={`group p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:border-blue-300 hover:shadow-md hover:scale-[1.02] transform text-center ${
              formData.currentRole === option.value
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md scale-[1.02]"
                : "border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <h3 className="font-medium text-gray-900 dark:text-white text-sm">
              {option.label}
            </h3>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTeamSizeStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-full animate-pulse"></div>
          <Users className="relative w-12 h-12 text-blue-600 mx-auto mb-4 animate-bounce-gentle" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          How many people are on your team?
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Include everyone who will use this CRM
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { value: "just-me", label: "Just me", desc: "1 person" },
          { value: "small-team", label: "Small team", desc: "2-10 people" },
          { value: "medium-team", label: "Medium team", desc: "11-25 people" },
          { value: "large-team", label: "Large team", desc: "26-50 people" },
          { value: "very-large", label: "Very large team", desc: "50+ people" },
        ].map((option, index) => (
          <div
            key={option.value}
            onClick={() => handleInputChange("teamSize", option.value)}
            className={`group p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:border-blue-300 hover:shadow-md hover:scale-[1.02] transform text-center ${
              formData.teamSize === option.value
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md scale-[1.02]"
                : "border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex flex-col items-center space-y-1">
              <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                {option.label}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {option.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCompanySizeStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-full animate-pulse"></div>
          <Building2 className="relative w-12 h-12 text-blue-600 mx-auto mb-4 animate-bounce-gentle" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          How many employees are in your company?
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          This helps us understand your organization size
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { value: "1", label: "Just me", desc: "1 employee" },
          { value: "2-10", label: "Small business", desc: "2-10 employees" },
          {
            value: "11-50",
            label: "Growing business",
            desc: "11-50 employees",
          },
          {
            value: "51-200",
            label: "Medium business",
            desc: "51-200 employees",
          },
          {
            value: "201-1000",
            label: "Large business",
            desc: "201-1000 employees",
          },
          { value: "1000+", label: "Enterprise", desc: "1000+ employees" },
        ].map((option, index) => (
          <div
            key={option.value}
            onClick={() => handleInputChange("companySize", option.value)}
            className={`group p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:border-blue-300 hover:shadow-md hover:scale-[1.02] transform text-center ${
              formData.companySize === option.value
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md scale-[1.02]"
                : "border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex flex-col items-center space-y-1">
              <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                {option.label}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {option.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Terms and Newsletter */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-start space-x-2">
          <Checkbox
            id="agreeToTerms"
            checked={formData.agreeToTerms}
            onCheckedChange={(checked) =>
              handleInputChange("agreeToTerms", checked as boolean)
            }
            disabled={isLoading}
            className="mt-1"
          />
          <Label
            htmlFor="agreeToTerms"
            className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed"
          >
            I agree to the{" "}
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
          </Label>
        </div>
        <div className="flex items-start space-x-2">
          <Checkbox
            id="subscribeNewsletter"
            checked={formData.subscribeNewsletter}
            onCheckedChange={(checked) =>
              handleInputChange("subscribeNewsletter", checked as boolean)
            }
            disabled={isLoading}
            className="mt-1"
          />
          <Label
            htmlFor="subscribeNewsletter"
            className="text-sm text-gray-600 dark:text-gray-300"
          >
            Send me product updates and sales tips
          </Label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-2000"></div>
      </div>

      <div className="w-full max-w-lg relative z-10">
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

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round((currentStep / totalSteps) * 100)}% complete
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Multi-step Form */}
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-8">
            {(() => {
              // Don't show email errors in top alert when on step 1 (they show under the field)
              const filteredErrors =
                currentStep === 1
                  ? Object.fromEntries(
                      Object.entries(validationErrors).filter(
                        ([key]) => key !== "email"
                      )
                    )
                  : validationErrors;

              const hasNonEmailErrors = Object.keys(filteredErrors).length > 0;
              const errorMessage = error || Object.values(filteredErrors)[0];

              return (
                (error || hasNonEmailErrors) && (
                  <Alert
                    variant="destructive"
                    className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20 animate-shake"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )
              );
            })()}

            {/* Render current step */}
            <div
              className={`transition-all duration-500 ease-in-out ${
                isSliding
                  ? slideDirection === "forward"
                    ? "transform translate-x-full opacity-0"
                    : "transform -translate-x-full opacity-0"
                  : "transform translate-x-0 opacity-100"
              }`}
            >
              {renderStep()}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              {currentStep > 1 || (currentStep === 1 && showOTPStep) ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (currentStep === 1 && showOTPStep) {
                      // Go back to email step
                      setShowOTPStep(false);
                      setOtpSent(false);
                      setOtpValue("");
                      setOtpError("");
                      setOtpVerified(false);
                      setOtpCanRetry(false);
                      setOtpExpiresAt(null);
                      setOtpSentAt(null);
                      setRemainingTime(0);
                      setResendAvailableIn(0);
                    } else {
                      handleBack();
                    }
                  }}
                  disabled={isLoading || otpSending || otpVerifying}
                  className="flex items-center gap-2 px-6 py-3 hover:scale-105 transition-all duration-200 hover:shadow-md"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              ) : (
                <div></div>
              )}

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={
                    isLoading ||
                    emailCheckLoading ||
                    otpSending ||
                    otpVerifying ||
                    (currentStep === 1 &&
                      !showOTPStep &&
                      (!formData.email || emailExists)) ||
                    (currentStep === 1 &&
                      showOTPStep &&
                      (!otpValue || otpValue.length !== 6)) ||
                    (currentStep === 2 &&
                      (!formData.firstName ||
                        !formData.lastName ||
                        !formData.password ||
                        !formData.confirmPassword ||
                        !formData.accountName)) ||
                    (currentStep === 3 && !formData.whatBringsYou) ||
                    (currentStep === 4 && !formData.currentRole) ||
                    (currentStep === 5 && !formData.teamSize)
                  }
                  className={`px-8 py-3 transition-all duration-300 shadow-lg ${
                    isLoading ||
                    emailCheckLoading ||
                    otpSending ||
                    otpVerifying ||
                    (currentStep === 1 &&
                      !showOTPStep &&
                      (!formData.email || emailExists)) ||
                    (currentStep === 1 &&
                      showOTPStep &&
                      (!otpValue || otpValue.length !== 6)) ||
                    (currentStep === 2 &&
                      (!formData.firstName ||
                        !formData.lastName ||
                        !formData.password ||
                        !formData.confirmPassword ||
                        !formData.accountName)) ||
                    (currentStep === 3 && !formData.whatBringsYou) ||
                    (currentStep === 4 && !formData.currentRole) ||
                    (currentStep === 5 && !formData.teamSize)
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-105 hover:shadow-xl"
                  }`}
                >
                  {currentStep === 1 && !showOTPStep && emailCheckLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Checking email...
                    </div>
                  ) : currentStep === 1 && !showOTPStep && otpSending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending code...
                    </div>
                  ) : currentStep === 1 && showOTPStep && otpVerifying ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Verifying...
                    </div>
                  ) : currentStep === 1 && showOTPStep ? (
                    <>
                      Verify & Continue
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    isLoading || !formData.agreeToTerms || !formData.companySize
                  }
                  className={`px-8 py-3 transition-all duration-300 shadow-lg ${
                    isLoading || !formData.agreeToTerms || !formData.companySize
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 hover:scale-105 hover:shadow-xl"
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating account...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      Create Account
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sign In Link */}
        <div className="text-center mt-6">
          <Link
            href="/pages/auth/sign-in"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
