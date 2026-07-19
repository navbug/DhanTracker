import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { Resend } from "resend";

const schema = z.object({
  name: z.string().min(1).max(100).trim(),
  message: z.string().min(5, "Message is too short").max(2000).trim(),
});

const resend = new Resend(process.env.RESEND_API_KEY);

const OWNER_EMAIL = process.env.CONTACT_OWNER_EMAIL ?? process.env.EMAIL_FROM ?? "";
const FROM_EMAIL  = process.env.EMAIL_FROM ?? "DhanTracker <noreply@dhantracker.in>";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, message } = parsed.data;
    // If logged in, use their account email; otherwise show name only
    const senderEmail = session?.user?.email ?? null;

    if (!OWNER_EMAIL) {
      console.error("[CONTACT] CONTACT_OWNER_EMAIL not set");
      return NextResponse.json({ success: false, error: "Contact not configured" }, { status: 503 });
    }

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: OWNER_EMAIL,
      subject: `DhanTracker Contact: ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <body style="margin:0;padding:0;background:#f8f9fb;font-family:'Helvetica Neue',Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;padding:40px 20px;">
              <tr>
                <td align="center">
                  <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e9ef;overflow:hidden;">
                    <tr>
                      <td style="background:#1a3560;padding:20px 28px;">
                        <span style="color:#ffffff;font-size:16px;font-weight:700;">DhanTracker — Contact Form</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:28px;">
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td style="padding-bottom:16px;border-bottom:1px solid #f1f5f9;">
                              <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;">From</p>
                              <p style="margin:0;font-size:14px;font-weight:600;color:#0f1729;">${name}</p>
                              ${senderEmail ? `<p style="margin:2px 0 0;font-size:12px;color:#64748b;">${senderEmail}</p>` : ""}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding-top:16px;">
                              <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;">Message</p>
                              <p style="margin:0;font-size:14px;color:#1e293b;line-height:1.7;white-space:pre-wrap;">${message}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:14px 28px;border-top:1px solid #f1f5f9;">
                        <p style="margin:0;font-size:11px;color:#cbd5e1;">Sent via DhanTracker contact form</p>
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

    if (error) {
      console.error("[CONTACT] Resend error:", error);
      return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[CONTACT] Error:", err);
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}