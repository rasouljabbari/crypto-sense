"use client";

import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  href?: string;
  showText?: boolean;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const dimMap = { sm: 24, md: 32, lg: 40 } as const;

export function Logo({ href, showText = true, showTagline = false, size = "md", className = "" }: LogoProps) {
  const dim = dimMap[size];

  const inner = (
    <div className={`flex items-center gap-3 group ${className}`}>
      <Image
        src="/logo.svg"
        alt="Crypto Sense"
        width={dim}
        height={dim}
        className="shrink-0 rounded-xl"
      />
      {showText && (
        <div className="min-w-0">
          <span className={`font-bold text-theme-text group-hover:text-emerald-400 transition-colors duration-200 truncate block ${size === "sm" ? "text-xs" : "text-sm"}`}>
            Crypto Sense
          </span>
          {showTagline && (
            <span className="text-[10px] text-theme-secondary leading-tight truncate block">
              Smart Crypto Analysis
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}
