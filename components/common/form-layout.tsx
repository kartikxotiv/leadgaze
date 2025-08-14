"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface FormLayoutProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  showDialogHeader?: boolean;
}

export function FormLayout({
  title,
  description,
  icon,
  children,
  className,
  showDialogHeader = false,
}: FormLayoutProps) {
  return (
    <div className="w-full">
      {showDialogHeader && (
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            {title}
          </DialogTitle>
        </DialogHeader>
      )}

      <Card
        className={cn(
          "w-full max-w-4xl",
          showDialogHeader && "mt-4",
          className
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
