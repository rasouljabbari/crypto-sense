export function autoReplyTemplate(firstName: string): string {
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
            <td style="padding:24px 32px;background:linear-gradient(135deg,#059669,#10b981);text-align:center;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">Thank You for Contacting Crypto Sense</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px 0;font-size:16px;color:#f3f4f6;line-height:1.6;">
                Hi ${firstName},
              </p>
              <p style="margin:0 0 16px 0;font-size:14px;color:#d1d5db;line-height:1.6;">
                Thank you for your message.
              </p>
              <p style="margin:0 0 16px 0;font-size:14px;color:#d1d5db;line-height:1.6;">
                We have successfully received your feedback.
              </p>
              <p style="margin:0 0 16px 0;font-size:14px;color:#d1d5db;line-height:1.6;">
                We'll review it as soon as possible.
              </p>
              <p style="margin:0;font-size:14px;color:#10b981;font-weight:600;">
                Crypto Sense Team
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #1f2937;text-align:center;">
              <p style="margin:0;font-size:11px;color:#6b7280;">Crypto Sense — Automated Reply</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
