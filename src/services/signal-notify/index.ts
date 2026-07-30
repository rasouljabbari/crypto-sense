import { Resend } from "resend";
import { signalEmailTemplate } from "./email/signal-template";

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(apiKey);
}

const FROM_EMAIL = "Crypto Sense <onboarding@resend.dev>";

export interface SignalNotifyInput {
  email: string;
  symbol: string;
  direction: "Long" | "Short";
  confidence: number;
  price: number;
  coinId: string;
}

export async function sendSignalEmail(data: SignalNotifyInput): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: `🚀 ${data.symbol} Ready for ${data.direction} — Crypto Sense`,
      html: signalEmailTemplate({
        symbol: data.symbol,
        direction: data.direction,
        confidence: data.confidence,
        price: data.price,
        coinId: data.coinId,
      }),
    });

    if (error) {
      console.error(`[SignalNotify] Failed to send email for ${data.symbol}:`, error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[SignalNotify] Error sending email for ${data.symbol}:`, msg);
    return { success: false, error: msg };
  }
}
