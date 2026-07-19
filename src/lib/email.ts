import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM ?? "DhanTracker <noreply@dhantracker.in>";
const APP_URL = process.env.NEXTAUTH_URL ?? "https://stellular-bubblegum-529a2f.netlify.app";

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Reset your DhanTracker password",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body style="margin:0;padding:0;background:#F8F9FB;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FB;padding:40px 16px;">
            <tr>
              <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #E5E9EF;overflow:hidden;">

                  <!-- Header -->
                  <tr>
                    <td style="background:#1a3660;padding:24px 32px;">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width:32px;height:32px;background:rgba(255,255,255,0.15);border-radius:8px;text-align:center;vertical-align:middle;">
                            <span style="color:#fff;font-size:16px;font-weight:700;">D</span>
                          </td>
                          <td style="padding-left:10px;">
                            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">DhanTracker</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:32px;">
                      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">
                        Reset your password
                      </h1>
                      <p style="margin:0 0 24px;font-size:14px;color:#6B7280;line-height:1.6;">
                        We received a request to reset the password for your DhanTracker account. Click the button below to choose a new password.
                      </p>

                      <!-- CTA Button -->
                      <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                        <tr>
                          <td style="background:#1a3660;border-radius:8px;">
                            <a href="${resetUrl}"
                              style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.1px;">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:0 0 8px;font-size:13px;color:#9CA3AF;">
                        This link expires in <strong style="color:#374151;">1 hour</strong>.
                        If you didn't request a password reset, you can safely ignore this email.
                      </p>

                      <!-- Fallback URL -->
                      <div style="margin-top:24px;padding:12px 16px;background:#F3F4F6;border-radius:8px;word-break:break-all;">
                        <p style="margin:0 0 4px;font-size:11px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Or copy this link</p>
                        <a href="${resetUrl}" style="font-size:12px;color:#1a3660;word-break:break-all;">${resetUrl}</a>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding:16px 32px;border-top:1px solid #F3F4F6;">
                      <p style="margin:0;font-size:11px;color:#D1D5DB;text-align:center;">
                        DhanTracker · Rule-Based Trading Journal
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
}