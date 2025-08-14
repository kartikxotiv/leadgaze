"use client";

import { useState, useEffect, useRef } from "react";
import { ThemeToggle } from "./theme-toggle";

interface Position {
  x: number;
  y: number;
}

const DEFAULT_POSITION: Position = { x: 20, y: 20 };

export function DraggableThemeToggle() {
  const [localPosition, setLocalPosition] =
    useState<Position>(DEFAULT_POSITION);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Simple mount detection
  useEffect(() => {
    setMounted(true);

    // Load saved position
    try {
      const saved = localStorage.getItem("theme-toggle-position");
      if (saved) {
        const position = JSON.parse(saved);
        setLocalPosition(position);
      }
    } catch (error) {
      console.warn("Failed to load theme toggle position:", error);
    }

    setIsVisible(true);
  }, []);

  // Save position when dragging ends
  const savePosition = (newPosition: Position) => {
    setLocalPosition(newPosition);
    try {
      localStorage.setItem(
        "theme-toggle-position",
        JSON.stringify(newPosition)
      );
    } catch (error) {
      console.warn("Failed to save theme toggle position:", error);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newPosition = {
        x: Math.max(
          0,
          Math.min(e.clientX - dragOffset.x, window.innerWidth - 50)
        ),
        y: Math.max(
          0,
          Math.min(e.clientY - dragOffset.y, window.innerHeight - 50)
        ),
      };
      setLocalPosition(newPosition);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const newPosition = {
        x: Math.max(
          0,
          Math.min(touch.clientX - dragOffset.x, window.innerWidth - 50)
        ),
        y: Math.max(
          0,
          Math.min(touch.clientY - dragOffset.y, window.innerHeight - 50)
        ),
      };
      setLocalPosition(newPosition);
    };

    const handleEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        savePosition(localPosition);
      }
    };

    // Add event listeners
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, dragOffset, localPosition]);

  // Auto-hide functionality
  useEffect(() => {
    const handleUserActivity = () => {
      setIsVisible(true);

      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }

      visibilityTimeoutRef.current = setTimeout(() => {
        if (!isDragging) {
          setIsVisible(false);
        }
      }, 3000);
    };

    // Show on mouse movement or touch
    document.addEventListener("mousemove", handleUserActivity);
    document.addEventListener("touchstart", handleUserActivity);
    document.addEventListener("scroll", handleUserActivity);

    // Initial trigger
    handleUserActivity();

    return () => {
      document.removeEventListener("mousemove", handleUserActivity);
      document.removeEventListener("touchstart", handleUserActivity);
      document.removeEventListener("scroll", handleUserActivity);

      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    };
  }, [isDragging]);

  // Don't render until position is loaded to prevent hydration mismatch
  if (!isPositionLoaded) {
    return null;
  }

  return (
    <div
      className={`fixed z-50 transition-all duration-300 cursor-move select-none ${
        isVisible ? "opacity-100" : "opacity-30"
      } ${isDragging ? "scale-110" : "scale-100"}`}
      style={{
        left: `${localPosition.x}px`,
        top: `${localPosition.y}px`,
        touchAction: "none",
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => {
        if (!isDragging) {
          setTimeout(() => setIsVisible(false), 1000);
        }
      }}
    >
      <div className="rounded-full bg-background/80 backdrop-blur-sm border shadow-lg p-1">
        <ThemeToggle />
      </div>
    </div>
  );
}
