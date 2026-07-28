export function ownerEmailTemplate(data: {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  timestamp: string;
  ip: string;
  userAgent: string;
}): string {
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
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">Crypto Sense Contact Form</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${fieldRow("First Name", data.firstName)}
                ${fieldRow("Last Name", data.lastName)}
                ${fieldRow("Email", `<a href="mailto:${data.email}" style="color:#10b981;">${data.email}</a>`)}
                ${fieldRow("Message", data.message.replace(/\n/g, "<br/>"))}
                ${fieldRow("Submitted At", data.timestamp)}
                ${fieldRow("IP", data.ip)}
                ${fieldRow("User Agent", `<span style="font-size:11px;color:#6b7280;">${data.userAgent}</span>`)}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #1f2937;text-align:center;">
              <p style="margin:0;font-size:11px;color:#6b7280;">Crypto Sense — Automated Contact Notification</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function fieldRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #1f2937;">
        <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">${label}</p>
        <p style="margin:0;font-size:14px;color:#f3f4f6;line-height:1.5;">${value}</p>
      </td>
    </tr>`;
}
