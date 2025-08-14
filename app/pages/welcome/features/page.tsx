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
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Building2,
  Users,
  Target,
  BarChart3,
  Calendar,
  Phone,
  Mail,
  TrendingUp,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
  Star,
  Globe,
  Clock,
  Database,
  Smartphone,
  Cloud,
  Lock,
  Workflow,
  MessageSquare,
  FileText,
  PieChart,
  Settings,
  Inbox,
  Bell,
  Search,
  Filter,
  Import,
  Download,
  Share2,
  MousePointer,
  Layers,
  Activity,
  DollarSign,
  Repeat,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function FeaturesPage() {
  const [activeFeature, setActiveFeature] = useState("lead-management");

  const featureCategories = [
    {
      id: "lead-management",
      title: "Lead Management",
      description: "Capture, track, and convert leads efficiently",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-950",
      features: [
        {
          title: "Multi-Channel Lead Capture",
          description:
            "Automatically capture leads from website forms, social media, email campaigns, and phone calls",
          icon: Inbox,
          benefits: [
            "Web form integration",
            "Social media monitoring",
            "Email campaign tracking",
            "Call log integration",
          ],
        },
        {
          title: "Lead Scoring & Qualification",
          description:
            "Intelligent scoring system to prioritize high-value prospects",
          icon: Target,
          benefits: [
            "Automated scoring",
            "Custom criteria",
            "Hot lead alerts",
            "Qualification workflows",
          ],
        },
        {
          title: "Lead Nurturing Campaigns",
          description: "Automated email sequences and follow-up reminders",
          icon: Mail,
          benefits: [
            "Email automation",
            "Drip campaigns",
            "Personalization",
            "A/B testing",
          ],
        },
        {
          title: "Lead Assignment & Routing",
          description: "Smart distribution of leads to the right team members",
          icon: Share2,
          benefits: [
            "Round-robin assignment",
            "Territory-based routing",
            "Skill-based matching",
            "Load balancing",
          ],
        },
      ],
    },
    {
      id: "sales-pipeline",
      title: "Sales Pipeline",
      description:
        "Visual pipeline management with drag-and-drop functionality",
      icon: Target,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-950",
      features: [
        {
          title: "Kanban Pipeline View",
          description:
            "Visual drag-and-drop interface for managing deals through sales stages",
          icon: Layers,
          benefits: [
            "Drag-and-drop deals",
            "Custom stages",
            "Progress tracking",
            "Probability weighting",
          ],
        },
        {
          title: "Deal Forecasting",
          description: "Accurate revenue predictions based on pipeline data",
          icon: TrendingUp,
          benefits: [
            "Revenue forecasting",
            "Probability analysis",
            "Historical trends",
            "Goal tracking",
          ],
        },
        {
          title: "Pipeline Analytics",
          description: "Deep insights into sales performance and bottlenecks",
          icon: BarChart3,
          benefits: [
            "Conversion rates",
            "Stage velocity",
            "Win/loss analysis",
            "Performance metrics",
          ],
        },
        {
          title: "Deal Collaboration",
          description: "Team collaboration tools for complex sales processes",
          icon: MessageSquare,
          benefits: [
            "Deal notes",
            "Team comments",
            "File sharing",
            "Activity timeline",
          ],
        },
      ],
    },
    {
      id: "task-automation",
      title: "Task & Automation",
      description: "Intelligent task management and workflow automation",
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-950",
      features: [
        {
          title: "Smart Task Management",
          description: "AI-powered task creation and prioritization",
          icon: CheckCircle2,
          benefits: [
            "Auto task creation",
            "Priority scoring",
            "Due date suggestions",
            "Smart reminders",
          ],
        },
        {
          title: "Workflow Automation",
          description:
            "Create custom workflows to automate repetitive processes",
          icon: Workflow,
          benefits: [
            "Custom triggers",
            "Multi-step workflows",
            "Conditional logic",
            "Integration support",
          ],
        },
        {
          title: "Follow-up Reminders",
          description:
            "Never miss important follow-ups with intelligent reminders",
          icon: Bell,
          benefits: [
            "Smart scheduling",
            "Multiple channels",
            "Escalation rules",
            "Snooze options",
          ],
        },
        {
          title: "Activity Tracking",
          description: "Comprehensive logging of all customer interactions",
          icon: Activity,
          benefits: [
            "Auto-logging",
            "Call recording",
            "Email tracking",
            "Meeting notes",
          ],
        },
      ],
    },
    {
      id: "analytics-reporting",
      title: "Analytics & Reporting",
      description: "Real-time insights and customizable reports",
      icon: BarChart3,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-950",
      features: [
        {
          title: "Real-time Dashboards",
          description: "Live performance metrics and KPI tracking",
          icon: PieChart,
          benefits: [
            "Live data updates",
            "Custom dashboards",
            "KPI tracking",
            "Goal monitoring",
          ],
        },
        {
          title: "Advanced Analytics",
          description: "Deep dive into sales performance and trends",
          icon: TrendingUp,
          benefits: [
            "Trend analysis",
            "Cohort analysis",
            "Predictive insights",
            "Custom metrics",
          ],
        },
        {
          title: "Custom Reports",
          description: "Build and schedule custom reports for any data",
          icon: FileText,
          benefits: [
            "Report builder",
            "Scheduled delivery",
            "Export options",
            "Share reports",
          ],
        },
        {
          title: "Performance Tracking",
          description: "Individual and team performance monitoring",
          icon: Target,
          benefits: [
            "Individual metrics",
            "Team comparisons",
            "Achievement tracking",
            "Performance reviews",
          ],
        },
      ],
    },
    {
      id: "communication",
      title: "Communication Hub",
      description: "Centralized communication management",
      icon: Phone,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100 dark:bg-indigo-950",
      features: [
        {
          title: "Integrated Calling",
          description: "Built-in phone system with call logging and recording",
          icon: Phone,
          benefits: [
            "Click-to-call",
            "Call recording",
            "Voicemail",
            "Call analytics",
          ],
        },
        {
          title: "Email Integration",
          description: "Seamless email management and tracking",
          icon: Mail,
          benefits: [
            "Email sync",
            "Open tracking",
            "Template library",
            "Mass email campaigns",
          ],
        },
        {
          title: "Meeting Scheduler",
          description: "Calendar integration and meeting coordination",
          icon: Calendar,
          benefits: [
            "Calendar sync",
            "Meeting rooms",
            "Zoom integration",
            "Automated reminders",
          ],
        },
        {
          title: "Communication Timeline",
          description: "Complete history of all customer interactions",
          icon: Clock,
          benefits: [
            "Interaction history",
            "Context preservation",
            "Team visibility",
            "Search functionality",
          ],
        },
      ],
    },
    {
      id: "security-compliance",
      title: "Security & Compliance",
      description: "Enterprise-grade security and data protection",
      icon: Shield,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-950",
      features: [
        {
          title: "Data Encryption",
          description:
            "End-to-end encryption for all data at rest and in transit",
          icon: Lock,
          benefits: [
            "AES-256 encryption",
            "SSL/TLS",
            "Key management",
            "Secure storage",
          ],
        },
        {
          title: "Access Control",
          description: "Role-based permissions and user management",
          icon: Settings,
          benefits: [
            "Role-based access",
            "2FA authentication",
            "Session management",
            "Audit logs",
          ],
        },
        {
          title: "Compliance Ready",
          description: "GDPR, CCPA, and SOC 2 compliance support",
          icon: FileText,
          benefits: [
            "GDPR compliance",
            "Data portability",
            "Right to deletion",
            "Audit trails",
          ],
        },
        {
          title: "Backup & Recovery",
          description: "Automated backups with point-in-time recovery",
          icon: Database,
          benefits: [
            "Automated backups",
            "Point-in-time recovery",
            "Disaster recovery",
            "99.9% uptime",
          ],
        },
      ],
    },
  ];

  const integrations = [
    { name: "Salesforce", logo: "🏢", category: "CRM" },
    { name: "HubSpot", logo: "🧡", category: "Marketing" },
    { name: "Slack", logo: "💬", category: "Communication" },
    { name: "Zoom", logo: "📹", category: "Video" },
    { name: "Google Workspace", logo: "📧", category: "Productivity" },
    { name: "Microsoft 365", logo: "📊", category: "Productivity" },
    { name: "Mailchimp", logo: "🐵", category: "Email Marketing" },
    { name: "Zapier", logo: "⚡", category: "Automation" },
    { name: "QuickBooks", logo: "💰", category: "Accounting" },
    { name: "Stripe", logo: "💳", category: "Payments" },
    { name: "DocuSign", logo: "✍️", category: "Documents" },
    { name: "Calendly", logo: "📅", category: "Scheduling" },
  ];

  const pricingTiers = [
    {
      name: "Starter",
      price: "$29",
      period: "per user/month",
      description: "Perfect for small teams getting started",
      features: [
        "Up to 1,000 contacts",
        "Basic pipeline management",
        "Email integration",
        "Mobile app access",
        "Standard support",
      ],
      popular: false,
    },
    {
      name: "Professional",
      price: "$59",
      period: "per user/month",
      description: "Advanced features for growing teams",
      features: [
        "Unlimited contacts",
        "Advanced automation",
        "Custom reports",
        "Phone integration",
        "Priority support",
        "API access",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "per user/month",
      description: "Full-featured solution for large organizations",
      features: [
        "Everything in Professional",
        "Advanced security",
        "Custom integrations",
        "Dedicated support",
        "White-label options",
        "SLA guarantee",
      ],
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Navigation */}
      <nav className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/pages/welcome"
                className="flex items-center gap-3 group"
              >
                <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 text-white shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <Building2 className="size-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    MyCRM
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Sales Platform
                  </p>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link href="/pages/welcome">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
              <Button asChild>
                <Link href="/pages/auth/sign-up">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-6 text-sm px-3 py-1">
              <Zap className="w-3 h-3 mr-1" />
              Comprehensive Feature Suite
            </Badge>
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Everything You Need to
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {" "}
                Scale Your Sales
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Discover how MyCRM's powerful features can transform your sales
              process, increase productivity, and drive revenue growth for your
              team.
            </p>
          </div>
        </div>

        {/* Floating gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
      </section>

      {/* Feature Categories */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs
            value={activeFeature}
            onValueChange={setActiveFeature}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-12">
              {featureCategories.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="flex flex-col items-center gap-2 p-4 text-xs"
                >
                  <category.icon className="w-5 h-5" />
                  <span className="hidden sm:block">{category.title}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {featureCategories.map((category) => (
              <TabsContent
                key={category.id}
                value={category.id}
                className="space-y-8"
              >
                {/* Category Header */}
                <div className="text-center mb-12">
                  <div
                    className={`w-16 h-16 rounded-full ${category.bgColor} flex items-center justify-center mx-auto mb-4`}
                  >
                    <category.icon className={`w-8 h-8 ${category.color}`} />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    {category.title}
                  </h2>
                  <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                    {category.description}
                  </p>
                </div>

                {/* Feature Cards */}
                <div className="grid md:grid-cols-2 gap-8">
                  {category.features.map((feature, index) => (
                    <Card
                      key={index}
                      className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md"
                    >
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-12 h-12 rounded-lg ${category.bgColor} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}
                          >
                            <feature.icon
                              className={`w-6 h-6 ${category.color}`}
                            />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-xl mb-2">
                              {feature.title}
                            </CardTitle>
                            <CardDescription className="text-base leading-relaxed">
                              {feature.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2">
                          {feature.benefits.map((benefit, benefitIndex) => (
                            <div
                              key={benefitIndex}
                              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
                            >
                              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <span>{benefit}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="bg-gray-50 dark:bg-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Seamless Integrations
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Connect MyCRM with your favorite tools and create a unified
              workflow
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {integrations.map((integration, index) => (
              <Card
                key={index}
                className="group hover:shadow-lg transition-all duration-300 text-center border-0 shadow-md hover:scale-105"
              >
                <CardContent className="p-6">
                  <div className="text-3xl mb-3">{integration.logo}</div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {integration.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {integration.category}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              View All Integrations
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Choose Your Plan
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Start with a plan that fits your team size and scale as you grow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingTiers.map((tier, index) => (
              <Card
                key={index}
                className={`relative border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${
                  tier.popular ? "ring-2 ring-blue-500 scale-105" : ""
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                    {tier.name}
                  </CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      {tier.price}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                      {tier.period}
                    </span>
                  </div>
                  <CardDescription className="mt-2">
                    {tier.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, featureIndex) => (
                      <li
                        key={featureIndex}
                        className="flex items-center gap-3"
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-gray-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${
                      tier.popular
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        : ""
                    }`}
                    variant={tier.popular ? "default" : "outline"}
                  >
                    Start {tier.name} Plan
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              All plans include 14-day free trial • No setup fees • Cancel
              anytime
            </p>
            <Button variant="ghost">Need a custom plan? Contact Sales</Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardContent className="p-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to Transform Your Sales Process?
              </h2>
              <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
                Join thousands of sales teams who have already revolutionized
                their workflow with MyCRM. Start your free trial today and
                experience the difference.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  variant="secondary"
                  className="px-8 py-3 text-lg"
                  asChild
                >
                  <Link href="/pages/auth/sign-up">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 py-3 text-lg border-white text-white hover:bg-white hover:text-blue-600"
                  asChild
                >
                  <Link href="/pages/welcome">View Live Demo</Link>
                </Button>
              </div>
              <div className="flex items-center justify-center gap-6 mt-8 text-sm opacity-75">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  14-day free trial
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  No credit card required
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Cancel anytime
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 text-white">
                  <Building2 className="size-4 text-white" />
                </div>
                <span className="text-xl font-bold">MyCRM</span>
              </div>
              <p className="text-gray-400 text-sm">
                The modern CRM platform for sales teams who want to close more
                deals.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link
                    href="/pages/welcome"
                    className="hover:text-white transition-colors"
                  >
                    Lead Management
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pipeline"
                    className="hover:text-white transition-colors"
                  >
                    Sales Pipeline
                  </Link>
                </li>
                <li>
                  <Link
                    href="/reports"
                    className="hover:text-white transition-colors"
                  >
                    Analytics
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tasks"
                    className="hover:text-white transition-colors"
                  >
                    Task Management
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Resources</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    API Reference
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    Community
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Company</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>
              &copy; 2024 MyCRM. All rights reserved. Built with ❤️ for sales
              teams worldwide.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
