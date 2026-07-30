export function signalEmailTemplate(data: {
  symbol: string;
  direction: string;
  confidence: number;
  price: number;
  coinId: string;
}): string {
  const isLong = data.direction === "Long";
  const arrow = isLong ? "↗" : "↘";
  const badgeColor = isLong ? "#10b981" : "#ef4444";
  const badgeBg = isLong ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)";
  const gradientFrom = isLong ? "#059669" : "#dc2626";
  const gradientTo = isLong ? "#10b981" : "#ef4444";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#030712;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#030712;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111827;border-radius:16px;border:1px solid #1f2937;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;background:linear-gradient(135deg,${gradientFrom},${gradientTo});text-align:center;">
              <p style="margin:0 0 8px;font-size:36px;font-weight:800;color:#ffffff;">${arrow}</p>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">${data.symbol}</h1>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">Ready for <strong style="color:#ffffff;">${data.direction}</strong> Position</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <!-- Direction Badge -->
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #1f2937;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Direction</p>
                    <span style="display:inline-block;padding:4px 12px;border-radius:6px;font-size:14px;font-weight:700;color:${badgeColor};background:${badgeBg};border:1px solid ${badgeColor};">
                      ${data.direction}
                    </span>
                  </td>
                </tr>
                <!-- Confidence -->
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #1f2937;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Confidence</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#f3f4f6;">${data.confidence}%</p>
                  </td>
                </tr>
                <!-- Price -->
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #1f2937;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Current Price</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#f3f4f6;">$${data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</p>
                  </td>
                </tr>
              </table>
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://cryptosense.app"}/analysis?coin=${encodeURIComponent(data.coinId)}"
                       style="display:inline-block;padding:14px 40px;border-radius:8px;font-size:14px;font-weight:700;color:#ffffff;background:linear-gradient(135deg,${gradientFrom},${gradientTo});text-decoration:none;">
                      View Analysis
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #1f2937;text-align:center;">
              <p style="margin:0;font-size:11px;color:#6b7280;">
                Crypto Sense — Real-time Trade Signal Alert<br/>
                <span style="font-size:10px;">This is an automated notification. You can disable this in your account settings.</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
