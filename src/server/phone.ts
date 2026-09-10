import "server-only";

const sid = process.env.TWILIO_ACCOUNT_SID;
const tok = process.env.TWILIO_AUTH_TOKEN;
const svc = process.env.TWILIO_VERIFY_SERVICE_SID;
export const phoneConfigured = () => Boolean(sid && tok && svc);

function auth() {
  return "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64");
}

export async function startPhoneVerification(phone: string): Promise<{ ok: boolean; error?: string }> {
  if (!phoneConfigured()) return { ok: true };
  const r = await fetch(`https://verify.twilio.com/v2/Services/${svc}/Verifications`, {
    method: "POST",
    headers: { authorization: auth(), "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: phone, Channel: "sms" }),
  });
  if (!r.ok) return { ok: false, error: "Couldn't send the code. Check the number and try again." };
  return { ok: true };
}

export async function checkPhoneVerification(phone: string, code: string): Promise<boolean> {
  if (!phoneConfigured()) return code.trim().length >= 4; // dev mode: any code passes
  const r = await fetch(`https://verify.twilio.com/v2/Services/${svc}/VerificationCheck`, {
    method: "POST",
    headers: { authorization: auth(), "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: phone, Code: code }),
  });
  if (!r.ok) return false;
  const j = (await r.json()) as { status?: string };
  return j.status === "approved";
}
