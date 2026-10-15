import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export type Actor = { id: string; orgId: string; name: string; role: string; locked: boolean };
export type Source = { label: string; href: string };
export class AssistantError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export const messageSchema = z.object({
  role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000),
}).strict();
export const chatSchema = z.object({
  messages: z.array(messageSchema).min(1).max(16),
  timeZone: z.string().max(100).default("UTC"), consent: z.literal(true),
}).strict().refine(v => v.messages.at(-1)?.role === "user", "End with your question")
  .refine(v => v.messages.reduce((n, m) => n + m.content.length, 0) <= 12000, "Conversation is too long");
export function assertActor(actor: Actor) {
  if (!actor.id || !actor.orgId || !["owner", "admin", "technician", "apprentice", "estimator"].includes(actor.role))
    throw new AssistantError("Your company access could not be verified.", 403);
}
export const office = (actor: Actor) => actor.role === "owner" || actor.role === "admin";
export const canReadJobDetail = (actor: Actor) => office(actor) || actor.role === "technician";
export function assertJobDetailAllowed(actor: Actor) {
  assertActor(actor);
  if (!canReadJobDetail(actor))
    throw new AssistantError("Your role can read assigned job summaries and your hours. Job details and activity notes require a technician or office account.", 403);
}
export function jobScope(actor: Actor, id?: string) {
  assertActor(actor);
  return { orgId: actor.orgId, ...(id ? { id } : {}),
    ...(office(actor) ? {} : { assignments: { some: { userId: actor.id } } }) };
}
export function jobSource(actor: Actor, id: string, label: string): Source {
  return { label, href: `/tm/${office(actor) ? "admin" : "tech"}/jobs/${encodeURIComponent(id)}` };
}
export const noteSchema = z.object({ jobId: z.string().min(1).max(150), text: z.string().trim().min(1).max(1200) }).strict();
const tokenSchema = noteSchema.extend({
  id: z.string().uuid(), actorId: z.string(), orgId: z.string(), expiresAt: z.number().int(),
}).strict();
export type Note = z.infer<typeof tokenSchema>;
export function createNoteToken(actor: Actor, input: unknown, secret: string, now = Date.now()) {
  assertActor(actor);
  if (!secret) throw new AssistantError("Activity logging is not configured.", 503);
  const note = noteSchema.parse(input);
  const payload: Note = { ...note, id: randomUUID(), actorId: actor.id, orgId: actor.orgId, expiresAt: now + 10 * 60_000 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${createHmac("sha256", secret).update(encoded).digest("base64url")}`;
}
export function verifyNoteToken(token: string, actor: Actor, secret: string, now = Date.now()): Note {
  assertActor(actor);
  if (!secret || token.length > 8000) throw new AssistantError("Please review the note again.");
  const [data, signature, extra] = token.split(".");
  if (!data || !signature || extra) throw new AssistantError("Please review the note again.");
  const expected = createHmac("sha256", secret).update(data).digest();
  const received = Buffer.from(signature, "base64url");
  if (expected.length !== received.length || !timingSafeEqual(expected, received))
    throw new AssistantError("Please review the note again.");
  let parsed;
  try { parsed = tokenSchema.safeParse(JSON.parse(Buffer.from(data, "base64url").toString())); }
  catch { throw new AssistantError("Please review the note again."); }
  if (!parsed.success || parsed.data.actorId !== actor.id || parsed.data.orgId !== actor.orgId || parsed.data.expiresAt <= now)
    throw new AssistantError("This review expired or belongs to a different sign-in. Please ask again.");
  return parsed.data;
}
export function assertNoteAllowed(actor: Actor, status: string, text: string, messages: Array<{role: string; content: string}>) {
  assertJobDetailAllowed(actor);
  if (actor.locked) throw new AssistantError("Your company is read-only. Ask the office to renew.", 403);
  if (["completed", "cancelled", "archived", "awaiting_invoice"].includes(status))
    throw new AssistantError("This job is closed or awaiting invoice. Ask the office before adding work.", 409);
  // Preserve the complete, latest report. Substrings can remove negations
  // ("not installed" -> "installed") or revive a report the user corrected.
  // Only a narrow, explicit colon-delimited command prefix can be omitted.
  const latest = messages.findLast(m => m.role === "user")?.content.trim();
  const report = latest?.replace(/^(?:please\s+)?(?:record|log|save)(?:\s+(?:this\s+)?(?:activity(?:\s+note)?|note)|\s+this)?\s*:\s*/i, "");
  if (!latest || (text !== latest && text !== report))
    throw new AssistantError("Please send the exact full note you want recorded, for example 'Record this note: ...'. I won't shorten your report or infer completed work.");
}
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin || req.headers.get("sec-fetch-site") === "cross-site")
    throw new AssistantError("Open the assistant in ReyGuild and try again.", 403);
}
