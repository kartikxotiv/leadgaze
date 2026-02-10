'use client';

import Image from 'next/image';

export function LiveDashboardPreview() {
  return (
    <div className="animate-in fade-in zoom-in relative mx-auto mt-12 p-4 duration-1000 md:p-6 lg:p-8">
      {/* Decorative Elements - Responsive Blur Blobs */}
      <div className="absolute -top-12 -left-12 h-32 w-32 animate-pulse rounded-full bg-blue-500/10 blur-3xl md:h-64 md:w-64" />
      <div className="absolute -right-12 -bottom-12 h-32 w-32 animate-pulse rounded-full bg-purple-500/10 blur-3xl delay-700 md:h-64 md:w-64" />

      {/* Image Container - Responsive and Sharp */}
      <div className="relative overflow-hidden rounded-[24px] bg-black shadow-2xl ring-1 ring-white/10">
        <Image
          src="/images/dashboard.webp.jpg"
          alt="LeadGaze Dashboard Preview"
          width={1920}
          height={1080}
          quality={100}
          priority
          className="h-auto w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
        />
      </div>
    </div>
  );
}
