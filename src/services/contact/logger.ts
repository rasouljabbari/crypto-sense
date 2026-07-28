type LogLevel = "info" | "success" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
}

function formatEntry(entry: LogEntry): string {
  const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
  if (!entry.meta) return base;
  return `${base} ${JSON.stringify(entry.meta)}`;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    meta,
  };

  const formatted = formatEntry(entry);
  if (level === "error") {
    console.error(formatted);
  } else {
    console.log(formatted);
  }
}

export function logContactAttempt(data: {
  email: string;
  ip: string;
  success: boolean;
  error?: string;
}) {
  const meta = {
    ip: data.ip,
    email: data.email,
  };

  if (data.success) {
    log("success", "Contact form submitted", meta);
  } else {
    log("error", "Contact form failed", { ...meta, error: data.error });
  }
}

export function logRateLimited(ip: string) {
  log("info", "Rate limited", { ip });
}
