import nodemailer from "nodemailer";

const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "onset.devs@gmail.com",
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendEmailNotification(
  email: string,
  question: string,
  response: string,
  topic: string
): Promise<void> {
  if (!process.env.GMAIL_APP_PASSWORD) {
    console.log(`[Email Notification] Skipped (no GMAIL_APP_PASSWORD configured) | To: ${email}`);
    return;
  }

  const appUrl = process.env.APP_URL || "https://onset-assistant.up.railway.app";

  await emailTransporter.sendMail({
    from: '"onset. Assistant" <onset.devs@gmail.com>',
    to: email,
    subject: `Your question about ${escapeHtml(topic)} has been answered`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">onset. Assistant</h2>
        <p style="color: #555;">Your question has been answered by our team:</p>
        <div style="background: #f5f5f5; border-left: 4px solid #4f46e5; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; font-weight: 600; color: #333;">Your question (${escapeHtml(topic)}):</p>
          <p style="margin: 8px 0 0; color: #555;">${escapeHtml(question)}</p>
        </div>
        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; font-weight: 600; color: #333;">Response:</p>
          <p style="margin: 8px 0 0; color: #555;">${escapeHtml(response)}</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${appUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">Open onset. Assistant</a>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">You received this email because you asked a question on onset. Assistant. You can disable email notifications in your profile settings.</p>
      </div>
    `,
  });

  console.log(`[Email Notification] Sent to: ${email} | Topic: ${topic}`);
}
