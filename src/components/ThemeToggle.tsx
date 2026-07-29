"use client";

import { useTheme } from "@/lib/theme";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  labelLight?: string;
  labelDark?: string;
}

export function ThemeToggle({ className = "", showLabel = false, labelLight = "Light mode", labelDark = "Dark mode" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className={className}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      <span className="w-5 h-5 shrink-0 flex items-center justify-center">
        {isDark ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </span>
      {showLabel && <span className="truncate">{isDark ? labelLight : labelDark}</span>}
    </button>
  );
}
