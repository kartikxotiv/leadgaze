"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface SidebarPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: "left" | "right" | "top" | "bottom";
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  overlayClassName?: string;
  loading?: boolean;
  loadingContent?: React.ReactNode;
}

export function SidebarPanel({
  open,
  onOpenChange,
  title,
  description,
  header,
  children,
  footer,
  side = "right",
  className,
  headerClassName,
  bodyClassName,
  overlayClassName,
  loading = false,
  loadingContent,
}: SidebarPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          "w-full sm:max-w-lg overflow-y-auto p-0",
          className
        )}
        // overlayClassName={overlayClassName}
            overlayClassName="bg-black/10"
      >
        {header ?? (
          <SheetHeader
            className={cn("px-4 py-6 bg-[#45a2ff]", headerClassName)}
          >
            {title ? (
              <SheetTitle className="text-white">{title}</SheetTitle>
            ) : null}
            {description ? (
              <SheetDescription className="text-white text-xs !mt-0">
                {description}
              </SheetDescription>
            ) : null}
          </SheetHeader>
        )}

        <div
          className={cn(
            "px-4 pb-6 pt-6 space-y-6",
            bodyClassName
          )}
        >
          {loading ? (
            loadingContent ?? (
              <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading...</span>
              </div>
            )
          ) : (
            children
          )}
        </div>

        {footer ? (
          <div className="border-t bg-white px-4 py-4">{footer}</div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

