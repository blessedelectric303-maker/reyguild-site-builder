import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { Actor, AssistantError, createNoteToken, verifyNoteToken } from "../lib/assistant/core";
import { createRecords } from "../lib/assistant/records";

const actor: Actor = { id: "tech-a", orgId: "org-a", name: "Alex", role: "technician", locked: false };
const note = verifyNoteToken(createNoteToken(actor, { jobId: "job-a", text: "Installed fixture." }, "test-only"), actor, "test-only");
const asDB = (fake: unknown) => fake as PrismaClient;

test("searches apply company and assignment scope and disclose truncation at 20 results", async () => {
  const calls: any[] = [];
  const db = asDB({ job: { async findMany(args: any) { calls.push(args); return Array.from({ length: 21 }, (_, i) => ({ id: String(i) })); } } });
  const result = await createRecords(db, actor).searchJobs("Smith");
  assert.equal(result.jobs.length, 20); assert.equal(result.truncated, true); assert.equal(result.limit, 20);
  assert.equal(calls[0].where.orgId, "org-a"); assert.deepEqual(calls[0].where.assignments, { some: { userId: "tech-a" } });
  assert.equal(calls[0].where.OR[0].customerName.contains, "Smith"); assert.equal(calls[0].take, 21);
  assert.equal("salePrice" in calls[0].select, false); assert.equal("customerEmail" in calls[0].select, false);
  await createRecords(db, { ...actor, role: "admin" }).searchJobs("");
  assert.equal(calls[1].where.orgId, "org-a"); assert.equal("assignments" in calls[1].where, false);
  assert.deepEqual(calls[1].where.status, { notIn: ["completed", "cancelled", "archived"] });
});

test("job detail selects no payroll, HR, location telemetry or contact data; price is office-only", async () => {
  for (const role of ["technician", "owner", "admin"]) {
    let captured: any;
    const db = asDB({ job: { async findFirst(args: any) { captured = args; return { id: "job-a", customerName: "Smith", status: "scheduled" }; } } });
    const job = await createRecords(db, { ...actor, role }).getJob("job-a");
    assert.equal(captured.where.id, "job-a"); assert.equal(captured.where.orgId, "org-a");
    assert.equal(captured.select.salePrice === true, role === "owner" || role === "admin");
    for (const field of ["hourlyWage", "hourlyCost", "customerPhone", "customerEmail", "lat", "lng", "notes"])
      assert.equal(field in captured.select, false);
    assert.deepEqual(captured.select.statusUpdates.where, { updateType: "assistant_note" });
    assert.deepEqual(captured.select.statusUpdates.select.user, { select: { name: true } });
    assert.equal(job.source.href.endsWith("/jobs/job-a"), true);
  }
});

test("apprentices and legacy estimators cannot gain job-detail or activity-write access", async () => {
  const db = asDB({ job: { async findFirst() { assert.fail("restricted detail queried Prisma"); } }, async $transaction() { assert.fail("restricted note started a transaction"); } });
  for (const role of ["apprentice", "estimator"]) {
    const records = createRecords(db, { ...actor, role });
    await assert.rejects(records.getJob("job-a"), (e: unknown) => e instanceof AssistantError && e.status === 403);
    await assert.rejects(records.saveNote(note), (e: unknown) => e instanceof AssistantError && e.status === 403);
  }
});

test("missing, other-tenant and unassigned jobs are indistinguishable authorization failures", async () => {
  const db = asDB({ job: { async findFirst(args: any) {
    assert.deepEqual(args.where, { orgId: "org-a", id: "foreign-job", assignments: { some: { userId: "tech-a" } } }); return null;
  } } });
  await assert.rejects(createRecords(db, actor).getJob("foreign-job"), (e: unknown) => e instanceof AssistantError && e.status === 404);
});

test("hours are always self-only and tenant-bound, with bounded results and open hours excluded", async () => {
  let captured: any;
  const db = asDB({ timeEntry: { async findMany(args: any) { captured = args; return Array.from({ length: 201 }, (_, i) => ({ id: String(i), clockOutAt: i === 0 ? null : new Date(), totalMinutes: 30 })); } } });
  const result = await createRecords(db, { ...actor, role: "owner" }).myHours("2026-10-01T00:00:00-04:00", "2026-10-08T00:00:00-04:00");
  assert.equal(captured.where.userId, "tech-a"); assert.deepEqual(captured.where.job, { orgId: "org-a" });
  assert.equal(captured.where.clockInAt.gte.toISOString(), "2026-10-01T04:00:00.000Z");
  assert.equal(captured.take, 201); assert.equal(result.entries.length, 200); assert.equal(result.truncated, true);
  assert.equal(result.closedMinutes, 199 * 30); assert.match(result.note, /not final paid hours/);
  assert.equal("hourlyWage" in captured.select, false);
});

test("invalid or unbounded hour ranges never reach Prisma", async () => {
  const db = asDB({ timeEntry: { async findMany() { assert.fail("invalid date reached the DB"); } } });
  for (const [from, to] of [["bad", "2026-10-01"], ["2026-10-01", "2026-10-01"], ["2026-10-02", "2026-10-01"], ["2026-01-01", "2026-12-01"]])
    await assert.rejects(createRecords(db, actor).myHours(from, to), AssistantError);
});

// Transactional in-memory fake, never a real Prisma client or database. Tests
// verify the callback, IDs, retry and isolation contract, not PostgreSQL itself.
function transactionalDB(options: { status?: string; missing?: boolean; failAudit?: boolean; errors?: string[]; prior?: any } = {}) {
  const state = { activities: new Map<string, any>(), audits: new Map<string, any>() };
  if (options.prior) state.audits.set(`assistant_audit_${note.id}`, options.prior);
  const calls: any[] = [];
  let attempts = 0;
  let version = 0;
  const db = asDB({ async $transaction(fn: (tx: any) => Promise<unknown>, settings: any) {
    attempts++; assert.equal(settings.isolationLevel, "Serializable");
    const snapshotVersion = version;
    const error = options.errors?.shift(); if (error) throw Object.assign(new Error("mock conflict"), { code: error });
    const activities = new Map(state.activities), audits = new Map(state.audits);
    const tx = {
      job: { async findFirst(args: any) { calls.push(args); return options.missing ? null : { id: "job-a", status: options.status || "in_progress" }; } },
      auditLog: {
        async findUnique(args: any) { return audits.get(args.where.id) || null; },
        async create(args: any) { if (options.failAudit) throw new Error("audit storage failed"); audits.set(args.data.id, args.data); return args.data; },
      },
      jobStatusUpdate: { async create(args: any) { if (activities.has(args.data.id)) throw Object.assign(new Error("duplicate"), { code: "P2002" }); activities.set(args.data.id, args.data); return args.data; } },
    };
    const result = await fn(tx);
    if(version!==snapshotVersion) throw Object.assign(new Error("mock serializable conflict"),{code:"P2034"});
    version++;
    state.activities = activities; state.audits = audits; return result;
  } });
  return { db, state, calls, attempts: () => attempts };
}

test("note and audit commit together with deterministic IDs, exact text and no business-state edits", async () => {
  const fake = transactionalDB(); const records = createRecords(fake.db, actor);
  const result = await records.saveNote(note);
  assert.equal(result.ok, true); assert.equal(fake.state.activities.size, 1); assert.equal(fake.state.audits.size, 1);
  assert.deepEqual(fake.state.activities.get(`assistant_note_${note.id}`), { id: `assistant_note_${note.id}`, jobId: "job-a", userId: "tech-a", updateType: "assistant_note", notes: note.text });
  const audit = fake.state.audits.get(`assistant_audit_${note.id}`);
  assert.equal(audit.orgId, actor.orgId); assert.equal(audit.actorUserId, actor.id); assert.equal(audit.actionType, "assistant_activity_logged");
  assert.deepEqual(JSON.parse(audit.newValue), { activityId: `assistant_note_${note.id}`, text: note.text });
  assert.deepEqual(fake.calls[0].where, { orgId: actor.orgId, id: note.jobId, assignments: { some: { userId: actor.id } } });
  await records.saveNote(note);
  assert.equal(fake.state.activities.size, 1); assert.equal(fake.state.audits.size, 1);
});

test("audit failure leaves no orphan note in the transaction", async () => {
  const fake = transactionalDB({ failAudit: true });
  await assert.rejects(createRecords(fake.db, actor).saveNote(note), /audit storage failed/);
  assert.equal(fake.state.activities.size, 0); assert.equal(fake.state.audits.size, 0);
});

test("simultaneous same-token confirmations retry serialization conflict and commit one note/audit pair", async () => {
  const fake = transactionalDB(); const records = createRecords(fake.db, actor);
  const results = await Promise.all([records.saveNote(note), records.saveNote(note)]);
  assert.ok(results.every(result => result.ok));
  assert.equal(fake.attempts(), 3); assert.equal(fake.state.activities.size, 1); assert.equal(fake.state.audits.size, 1);
});

test("record save independently rejects a note belonging to a different principal before any transaction", async () => {
  const fake = transactionalDB();
  for (const input of [{ ...note, actorId: "other" }, { ...note, orgId: "other" }])
    await assert.rejects(createRecords(fake.db, actor).saveNote(input), (e: unknown) => e instanceof AssistantError && e.status === 403);
  assert.equal(fake.attempts(), 0);
});

test("save rechecks access, job status and subscription instead of trusting proposal-time state", async () => {
  for (const options of [{ missing: true }, ...["completed", "cancelled", "archived", "awaiting_invoice"].map(status => ({ status }))]) {
    const fake = transactionalDB(options);
    await assert.rejects(createRecords(fake.db, actor).saveNote(note), AssistantError);
    assert.equal(fake.state.activities.size, 0); assert.equal(fake.state.audits.size, 0);
  }
  const fake = transactionalDB();
  await assert.rejects(createRecords(fake.db, { ...actor, locked: true }).saveNote(note), AssistantError);
  assert.equal(fake.attempts(), 0);
});

test("retry after a successful save remains idempotent even when the job subsequently closes", async () => {
  const fake = transactionalDB({ status: "completed", prior: { actorUserId: actor.id, orgId: actor.orgId, targetId: note.jobId } });
  assert.equal((await createRecords(fake.db, actor).saveNote(note)).ok, true);
  assert.equal(fake.state.activities.size, 0);
});

test("a prior audit with a different actor, company or job is rejected", async () => {
  const valid = { actorUserId: actor.id, orgId: actor.orgId, targetId: note.jobId };
  for (const prior of [{ ...valid, actorUserId: "other" }, { ...valid, orgId: "other" }, { ...valid, targetId: "other" }]) {
    const fake = transactionalDB({ prior });
    await assert.rejects(createRecords(fake.db, actor).saveNote(note), (e: unknown) => e instanceof AssistantError && e.status === 409);
    assert.equal(fake.state.activities.size, 0);
  }
});

test("unique-key and serializable conflicts retry, unrelated failures do not, and retries are bounded", async () => {
  const recovered = transactionalDB({ errors: ["P2002", "P2034"] });
  await createRecords(recovered.db, actor).saveNote(note);
  assert.equal(recovered.attempts(), 3); assert.equal(recovered.state.activities.size, 1);
  const exhausted = transactionalDB({ errors: ["P2034", "P2034", "P2034"] });
  await assert.rejects(createRecords(exhausted.db, actor).saveNote(note)); assert.equal(exhausted.attempts(), 3);
  const unrelated = transactionalDB({ errors: ["P1001"] });
  await assert.rejects(createRecords(unrelated.db, actor).saveNote(note)); assert.equal(unrelated.attempts(), 1);
});
