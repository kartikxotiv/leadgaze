'use client';

import { useEffect, useMemo, useState } from 'react';

import { Loader2, Sparkles } from 'lucide-react';

const loadingMessages = [
  'Preparing your workspace...',
  'Loading customer relationships...',
  'Fetching team insights...',
  'Syncing business data...',
  'Building your dashboard...',
  'Crunching performance metrics...',
  'Gathering real-time updates...',
  'Connecting your business modules...',
  'Setting up your productivity tools...',
  'Almost ready for action...',
  'Optimizing your workspace experience...',
  'Optimizing workspace performance...',
  'Almost ready...',
];

export function FullScreenLoader() {
  const [mounted, setMounted] = useState(false);

  const shuffledMessages = useMemo(
    () =>
      mounted
        ? [...loadingMessages].sort(() => Math.random() - 0.5)
        : loadingMessages,
    [mounted],
  );

  const particles = useMemo(
    () =>
      mounted
        ? [...Array(15)].map(() => ({
            left: Math.random() * 100,
            top: Math.random() * 100,
            duration: 3 + Math.random() * 4,
            delay: Math.random() * 2,
          }))
        : [],
    [mounted],
  );

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % shuffledMessages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [mounted, shuffledMessages]);

  const message = shuffledMessages[index];

  return (
    <div className="bg-background relative flex h-screen items-center justify-center overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0">
        <div className="bg-primary/10 absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full blur-3xl" />

        <div className="bg-primary/5 absolute top-1/3 left-1/3 h-72 w-72 animate-pulse rounded-full blur-3xl delay-1000" />

        <div className="bg-primary/5 absolute right-1/3 bottom-1/3 h-72 w-72 animate-pulse rounded-full blur-3xl delay-500" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p, i) => (
          <div
            key={i}
            className="bg-primary/20 absolute h-2 w-2 animate-bounce rounded-full"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex max-w-sm flex-col items-center text-center">
        {/* Logo Container */}
        <div className="relative mb-8">
          <div className="border-primary/20 h-24 w-24 animate-spin rounded-full border-4 border-dashed" />

          <div className="bg-card absolute inset-3 flex items-center justify-center rounded-full border shadow-lg">
            <Sparkles className="text-primary h-8 w-8 animate-pulse" />
          </div>
        </div>

        {/* Main Loader */}
        <div className="mb-4 flex items-center gap-3">
          <Loader2 className="text-primary h-5 w-5 animate-spin" />
          <span className="text-lg font-semibold">Initializing Workspace</span>
        </div>

        {/* Dynamic Message */}
        <p
          key={message}
          className="text-muted-foreground animate-in fade-in text-sm duration-500"
        >
          {message}
        </p>

        {/* Progress Pulse */}
        <div className="bg-muted mt-8 h-1.5 w-64 overflow-hidden rounded-full">
          <div className="bg-primary h-full w-1/3 animate-[loader_2s_ease-in-out_infinite] rounded-full" />
        </div>
      </div>

      <style jsx>{`
        @keyframes loader {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  );
}
