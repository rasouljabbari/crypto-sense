"use client";

import type { ReactNode } from "react";

interface CardProps {
  readonly title?: string;
  readonly subtitle?: string;
  readonly icon?: ReactNode;
  readonly action?: ReactNode;
  readonly children?: ReactNode;
  readonly className?: string;
  readonly loading?: boolean;
  readonly error?: string | null;
}

export function Card({
  title,
  subtitle,
  icon,
  action,
  children,
  className = "",
  loading,
  error,
}: CardProps) {
  return (
    <div
      className={`bg-gray-900/50 border border-gray-800 rounded-xl shadow-card transition-all duration-300 hover:border-gray-700 ${className}`}
    >
      {title !== undefined && (
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-800/50">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <span className="shrink-0 text-lg">{icon}</span>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-100 truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action && (
            <div className="shrink-0 ml-2">{action}</div>
          )}
        </div>
      )}
      <div className="p-5">
        {error ? (
          <p className="text-xs text-red-400">{error}</p>
        ) : loading ? (
          <div className="space-y-3">
            <div className="h-5 bg-gray-800 rounded animate-pulse w-full" />
            <div className="h-5 bg-gray-800 rounded animate-pulse w-3/4" />
            <div className="h-5 bg-gray-800 rounded animate-pulse w-1/2" />
            <div className="h-5 bg-gray-800 rounded animate-pulse w-2/3" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
