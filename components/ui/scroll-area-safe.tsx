"use client";

import * as React from "react";
import { ScrollArea } from "./scroll-area";
import { cn } from "@/lib/utils";

interface ScrollAreaErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ScrollAreaErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode; className?: string },
  ScrollAreaErrorBoundaryState
> {
  constructor(props: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    className?: string;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ScrollAreaErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("ScrollArea error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className={cn("relative overflow-auto", this.props.className)}>
            {this.props.children}
          </div>
        )
      );
    }

    return this.props.children;
  }
}

interface SafeScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  fallback?: React.ReactNode;
  [key: string]: any;
}

export function SafeScrollArea({
  children,
  className,
  fallback,
  ...props
}: SafeScrollAreaProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("relative overflow-auto", className)} {...props}>
        {children}
      </div>
    );
  }

  return (
    <ScrollAreaErrorBoundary className={className} fallback={fallback}>
      <ScrollArea className={className} {...props}>
        {children}
      </ScrollArea>
    </ScrollAreaErrorBoundary>
  );
}

export default SafeScrollArea;
