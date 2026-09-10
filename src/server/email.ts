import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "Cardpost <onboarding@resend.dev>";

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email → ${to}] ${subject}\n${text}\n`);
    return { delivered: false as const };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: FROM, to, subject, text, html: html ?? undefined });
  if (error) throw new Error(`Email failed: ${error.message}`);
  return { delivered: true as const };
}

export function appUrl(): string {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const u = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || (vercel ? `https://${vercel}` : "http://localhost:3000");
  return u.replace(/\/$/, "");
}
