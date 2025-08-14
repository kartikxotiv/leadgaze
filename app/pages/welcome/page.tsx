"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Globe,
  Shield,
  Target,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function WelcomePage() {
  // Note: Auth protection is handled by middleware
  // This page only renders for unauthenticated users

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-2000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <div className="flex aspect-square size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 text-white shadow-2xl">
              <Building2 className="size-10 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Welcome to MyCRM
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
            The complete sales platform for modern businesses. Manage leads,
            track deals, and grow your revenue with powerful CRM tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/pages/auth/sign-up">
              <Button
                size="lg"
                className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/pages/auth/sign-in">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl">Lead Management</CardTitle>
              <CardDescription>
                Capture, track, and nurture leads with intelligent automation
                and scoring.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-xl">Sales Pipeline</CardTitle>
              <CardDescription>
                Visualize your sales process and track deals through every
                stage.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-xl">Analytics & Reports</CardTitle>
              <CardDescription>
                Get insights into your sales performance with detailed
                analytics.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-xl">Automation</CardTitle>
              <CardDescription>
                Automate repetitive tasks and focus on what matters most.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardHeader>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl">Security</CardTitle>
              <CardDescription>
                Enterprise-grade security to keep your data safe and compliant.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardHeader>
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <CardTitle className="text-xl">Multi-Organization</CardTitle>
              <CardDescription>
                Manage multiple organizations and teams from a single platform.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardContent className="p-12">
              <h2 className="text-3xl font-bold mb-4">
                Ready to Transform Your Sales?
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Join thousands of businesses using MyCRM to grow their revenue.
              </p>
              <Link href="/pages/auth/sign-up">
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-lg px-8 py-6"
                >
                  Start Your Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
