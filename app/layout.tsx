import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { SimpleThemeToggle } from "@/components/simple-theme-toggle";
import { AuthHydrationProvider } from "@/components/auth/auth-hydration-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MyCRM - Sales Platform",
  description:
    "Professional CRM system for managing leads, deals, and sales pipeline",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <ThemeProvider>
            <AuthHydrationProvider>
              {children}
              {/* <SimpleThemeToggle /> */}
              <SonnerToaster />
            </AuthHydrationProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
