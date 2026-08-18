import { Resend } from "resend";

const resendKey = process.env.RESEND_API_KEY;
const resend = resendKey ? new Resend(resendKey) : null;

// EMAIL_FROM is set in the environment to "ReyGuild <noreply@reyguild.com>".
// reyguild.com is verified in Resend, so sends from that address are authenticated.
// The fallback below is only used if EMAIL_FROM is somehow missing.
const FROM_ADDRESS =
  process.env.EMAIL_FROM || "ReyGuild <noreply@reyguild.com>";

// Public URL used in email links. Falls back to the production URL.
// Override per environment via NEXT_PUBLIC_APP_URL.
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://blessed-track.vercel.app";

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

async function sendEmail({ to, subject, html, text }: SendArgs) {
  if (!resend) {
    // Fail soft in development if the key is missing. Logs but doesn't crash.
    console.warn(
      "[email] RESEND_API_KEY not set — skipping email to " + to + " (" + subject + ")"
    );
    return { ok: false, reason: "no_api_key" as const };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
      text,
    });

    if (result.error) {
      console.error("[email] Resend error:", result.error);
      return { ok: false, reason: "send_failed" as const, error: result.error };
    }

    return { ok: true, id: result.data?.id };
  } catch (err) {
    console.error("[email] Unexpected error:", err);
    return { ok: false, reason: "exception" as const };
  }
}

export async function sendPasswordResetEmail(args: {
  to: string;
  userName: string;
  resetToken: string;
}) {
  const resetUrl =
    APP_URL +
    "/reset-password?token=" +
    encodeURIComponent(args.resetToken);

  const subject = "Reset your ReyGuild password";

  const text =
    "Hi " +
    args.userName +
    ",\n\n" +
    "Someone requested a password reset for your ReyGuild account. " +
    "If this was you, click the link below to set a new password. " +
    "This link expires in 1 hour.\n\n" +
    resetUrl +
    "\n\n" +
    "If you did not request this, you can safely ignore this email. " +
    "Your password will not change.\n\n" +
    "— ReyGuild";

  const html =
    '<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">' +
    '<h1 style="font-size:20px;font-weight:600;margin:0 0 16px 0;">Reset your password</h1>' +
    '<p style="font-size:15px;line-height:1.5;margin:0 0 16px 0;">Hi ' +
    escapeHtml(args.userName) +
    ",</p>" +
    '<p style="font-size:15px;line-height:1.5;margin:0 0 16px 0;">Someone requested a password reset for your ReyGuild account. ' +
    "If this was you, click the button below to set a new password. " +
    "This link expires in 1 hour.</p>" +
    '<p style="margin:24px 0;"><a href="' +
    resetUrl +
    '" style="display:inline-block;background:#1e3157;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:500;font-size:15px;">Set new password</a></p>' +
    '<p style="font-size:13px;color:#475569;line-height:1.5;margin:0 0 16px 0;">If the button does not work, paste this link into your browser:<br><a href="' +
    resetUrl +
    '" style="color:#1e3157;word-break:break-all;">' +
    resetUrl +
    "</a></p>" +
    '<p style="font-size:13px;color:#475569;line-height:1.5;margin:24px 0 0 0;">If you did not request this, you can safely ignore this email. Your password will not change.</p>' +
    '<p style="font-size:13px;color:#94a3b8;margin:24px 0 0 0;">— <span style="color:#c68a22;font-weight:600;">Rey</span><span style="color:#16243f;font-weight:600;">Guild</span></p>' +
    "</div>";

  return sendEmail({ to: args.to, subject, html, text });
}

export async function sendVerificationEmail(args: {
  to: string;
  userName: string;
  companyName: string;
  verificationToken: string;
}) {
  const verifyUrl =
    APP_URL +
    "/verify-email?token=" +
    encodeURIComponent(args.verificationToken);

  const subject = "Verify your email — Welcome to ReyGuild";

  const text =
    "Hi " +
    args.userName +
    ",\n\n" +
    "Welcome to ReyGuild! Your 14-day free trial for " +
    args.companyName +
    " has started.\n\n" +
    "Please verify your email by clicking the link below. " +
    "This link expires in 24 hours.\n\n" +
    verifyUrl +
    "\n\n" +
    "If you did not sign up for ReyGuild, you can safely ignore this email.\n\n" +
    "— ReyGuild";

  const html =
    '<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">' +
    '<h1 style="font-size:22px;font-weight:600;margin:0 0 8px 0;">Welcome to <span style="color:#c68a22;">Rey</span><span style="color:#16243f;">Guild</span></h1>' +
    '<p style="font-size:14px;color:#64748b;margin:0 0 24px 0;">Your 14-day free trial has started</p>' +
    '<p style="font-size:15px;line-height:1.5;margin:0 0 16px 0;">Hi ' +
    escapeHtml(args.userName) +
    ",</p>" +
    '<p style="font-size:15px;line-height:1.5;margin:0 0 16px 0;">Thanks for signing up <strong>' +
    escapeHtml(args.companyName) +
    "</strong>. Before you get started, please verify your email by clicking the button below. " +
    "This link expires in 24 hours.</p>" +
    '<p style="margin:24px 0;"><a href="' +
    verifyUrl +
    '" style="display:inline-block;background:#1e3157;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:500;font-size:15px;">Verify email and start trial</a></p>' +
    '<p style="font-size:13px;color:#475569;line-height:1.5;margin:0 0 16px 0;">If the button does not work, paste this link into your browser:<br><a href="' +
    verifyUrl +
    '" style="color:#1e3157;word-break:break-all;">' +
    verifyUrl +
    "</a></p>" +
    '<p style="font-size:13px;color:#475569;line-height:1.5;margin:24px 0 0 0;">If you did not sign up for ReyGuild, you can safely ignore this email.</p>' +
    '<p style="font-size:13px;color:#94a3b8;margin:24px 0 0 0;">— <span style="color:#c68a22;font-weight:600;">Rey</span><span style="color:#16243f;font-weight:600;">Guild</span></p>' +
    "</div>";

  return sendEmail({ to: args.to, subject, html, text });
}

// ---------------------------------------------------------------------------
// Customer status emails (sent when a tech taps "On My Way" or "Arrived").
// Universal wording — no company or tech name — so it works for any org.
// scheduledStart is optional; if missing, the time phrase is dropped cleanly.
// ---------------------------------------------------------------------------

function formatTimeToday(scheduledStart: Date | null | undefined): string {
  if (!scheduledStart) return "";
  try {
    const t = new Date(scheduledStart).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return " for your service scheduled at " + t + " today";
  } catch {
    return "";
  }
}

function customerEmailShell(headline: string, bodyLine: string): string {
  return (
    '<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">' +
    '<h1 style="font-size:20px;font-weight:600;margin:0 0 16px 0;">' +
    escapeHtml(headline) +
    "</h1>" +
    '<p style="font-size:15px;line-height:1.5;margin:0 0 16px 0;">' +
    escapeHtml(bodyLine) +
    "</p>" +
    '<p style="font-size:13px;color:#94a3b8;margin:24px 0 0 0;">— <span style="color:#c68a22;font-weight:600;">Rey</span><span style="color:#16243f;font-weight:600;">Guild</span></p>' +
    "</div>"
  );
}

export async function sendCustomerOnTheWayEmail(args: {
  to: string;
  scheduledStart?: Date | null;
}) {
  const timePhrase = formatTimeToday(args.scheduledStart);
  const line = "Your tech is on the way" + timePhrase + ".";
  const subject = "Your tech is on the way";
  const text = line + "\n\n— ReyGuild";
  const html = customerEmailShell("Your tech is on the way", line);
  return sendEmail({ to: args.to, subject, html, text });
}

export async function sendCustomerArrivedEmail(args: { to: string }) {
  const line = "Your tech has arrived.";
  const subject = "Your tech has arrived";
  const text = line + "\n\n— ReyGuild";
  const html = customerEmailShell("Your tech has arrived", line);
  return sendEmail({ to: args.to, subject, html, text });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
