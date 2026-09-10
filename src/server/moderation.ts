import "server-only";

const BLOCKED = ["idiot", "stupid", "hate you", "ugly", "loser", "shut up", "kill yourself", "kys"];

export type ModerationResult = { ok: true } | { ok: false; reason: string };

/**
 * Wandering card text is checked at send time, before it leaves.
 * Uses the OpenAI moderation endpoint when configured, otherwise a small word list.
 */
export async function moderate(text: string): Promise<ModerationResult> {
  const lower = text.toLowerCase();
  const hit = BLOCKED.find((w) => lower.includes(w));
  if (hit) return { ok: false, reason: "language" };
  if (!process.env.OPENAI_API_KEY) return { ok: true };
  try {
    const r = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: "omni-moderation-latest", input: text }),
    });
    if (!r.ok) return { ok: true }; // fail open on provider errors; word list already ran
    const j = (await r.json()) as { results?: { flagged: boolean; categories: Record<string, boolean> }[] };
    const res = j.results?.[0];
    if (res?.flagged) {
      const cat = Object.entries(res.categories).find(([, v]) => v)?.[0] ?? "content";
      return { ok: false, reason: cat };
    }
    return { ok: true };
  } catch {
    return { ok: true };
  }
}
