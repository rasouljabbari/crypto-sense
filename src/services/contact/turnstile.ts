const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileResult {
  success: boolean;
  error?: string;
}

export async function verifyTurnstile(token: string, ip: string): Promise<TurnstileResult> {
  if (!TURNSTILE_SECRET) {
    console.error("[SECURITY] TURNSTILE_SECRET_KEY not configured — rejecting request");
    return { success: false, error: "Security verification not configured" };
  }

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET,
        response: token,
        remoteip: ip,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      const errorCodes = data["error-codes"] ?? [];
      return {
        success: false,
        error: `Turnstile failed: ${errorCodes.join(", ")}`,
      };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: `Turnstile verification error: ${msg}` };
  }
}
