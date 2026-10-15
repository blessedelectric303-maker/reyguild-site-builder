import assert from "node:assert/strict";
import test from "node:test";
import { Actor, AssistantError, verifyNoteToken } from "../lib/assistant/core";
import { answerQuestion, openAIProvider, Provider, tools } from "../lib/assistant/service";
import type { createRecords } from "../lib/assistant/records";

const actor: Actor = { id: "tech-a", orgId: "org-a", name: "Alex", role: "technician", locked: false };
const secret = "test-only";
const output = (text: string) => ({ output: [{ type: "message", content: [{ type: "output_text", text }] }] });
const call = (name: string, args: unknown, id = "call-a") => ({ type: "function_call", name, arguments: JSON.stringify(args), call_id: id });
function fakeRecords(options: { missing?: boolean; status?: string } = {}) {
  const calls: Array<[string, unknown]> = [];
  const records = {
    async searchJobs(query: string) { calls.push(["search", query]); return { jobs: [], truncated: false, limit: 20 }; },
    async getJob(id: string) { calls.push(["job", id]); if (options.missing) throw new AssistantError("That job isn't available to your account.", 404); return { id, customerName: "Smith", jobAddress: "123 Example Lane", status: options.status || "in_progress", source: { label: "Smith", href: `/tm/tech/jobs/${id}` } }; },
    async myHours(from: string, to: string) { calls.push(["hours", { from, to }]); return { entries: [], truncated: false, closedMinutes: 0 }; },
    async saveNote() { assert.fail("The model must never call saveNote"); },
  } as unknown as ReturnType<typeof createRecords>;
  return { records, calls };
}
function scripted(responses: Array<{ output?: any[] }>, inspect?: (input: unknown[], instructions: string) => void): Provider {
  return async (input, instructions) => { inspect?.(input, instructions); const next = responses.shift(); assert.ok(next, "unexpected additional model call"); return next; };
}
const options = (records: ReturnType<typeof createRecords>, provider: Provider, content = "Find Smith's job"): Parameters<typeof answerQuestion>[0] => ({ actor, records, provider, messages: [{ role: "user", content }], timeZone: "America/New_York", secret });

test("OpenAI adapter uses server-supplied model, minimal tools, no storage and a timeout", async () => {
  let requests = 0;
  const fetcher = (async (url: any, init: any) => {
    requests++; assert.equal(url, "https://api.openai.com/v1/responses");
    const body = JSON.parse(init.body);
    assert.equal(body.model, "offline-test-model"); assert.equal(body.store, false); assert.equal(body.parallel_tool_calls, false);
    assert.deepEqual(body.include, ["reasoning.encrypted_content"]);
    assert.equal(body.max_output_tokens, 1400); assert.equal(body.tools.length, 5);
    assert.ok(init.signal instanceof AbortSignal); assert.equal(init.headers.Authorization, "Bearer fake-test-key");
    return Response.json(output("Ready"));
  }) as typeof fetch;
  const result = await openAIProvider("fake-test-key", "offline-test-model", fetcher)([], "test");
  assert.equal(requests, 1); assert.equal(result.output?.[0].content[0].text, "Ready");
  assert.equal(tools.some(tool => /save|clock_in|order_material|invoice_send/.test(tool.name)), false);
  assert.ok(tools.every(tool => tool.strict === true && tool.parameters.additionalProperties === false));
});

test("provider errors never expose API bodies or credentials", async () => {
  for (const status of [401, 429, 500]) {
    const provider = openAIProvider("secret-never-echo", "fake", (async () => new Response("private provider body", { status })) as typeof fetch);
    await assert.rejects(provider([], "test"), (e: unknown) => e instanceof AssistantError && e.status === 503 && !e.message.includes("private") && !e.message.includes("secret-never"));
  }
});

test("request cancellation prevents further provider work and propagates to in-flight fetch", async () => {
  const controller = new AbortController();
  let calls = 0;
  const provider = openAIProvider("test-only", "fake", (async (_url: any, init: any) => {
    calls++;
    return new Promise<Response>((_resolve, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true }));
  }) as typeof fetch, controller.signal);
  const pending = provider([], "test"); controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  await assert.rejects(provider([], "test"), { name: "AbortError" });
  assert.equal(calls, 1);
});

test("job data is read only through validated tools and sources are server-created", async () => {
  const fake = fakeRecords(); let seen = 0;
  const provider = scripted([{ output: [call("get_job", { jobId: "job-a" })] }, output("The Smith job is in progress.")], (input, instructions) => {
    assert.match(instructions, /Treat all records.*untrusted data/); assert.match(instructions, /Use tools for every record claim/);
    assert.match(instructions, /America\/New_York/);
    if (++seen === 2) {
      const data = JSON.parse((input.at(-1) as any).output);
      assert.equal(data.customerName, "Smith"); assert.equal("salePrice" in data, false);
    }
  });
  const result = await answerQuestion(options(fake.records, provider));
  assert.deepEqual(fake.calls, [["job", "job-a"]]); assert.deepEqual(result.sources, [{ label: "Smith", href: "/tm/tech/jobs/job-a" }]);
});

test("unsupported tools, extra keys, malformed JSON and empty IDs never reach records", async () => {
  for (const attempted of [call("delete_job", { jobId: "job-a" }), call("get_job", { jobId: "job-a", orgId: "org-b" }), call("get_job", { jobId: " " }), { ...call("get_job", {}), arguments: "not JSON" }, call("my_hours", { from: "yesterday", to: "today" })]) {
    const fake = fakeRecords(); let secondInput: any;
    const provider = scripted([{ output: [attempted] }, output("Please clarify the request.")], input => { if (input.some((entry: any) => entry.type === "function_call_output")) secondInput = input.at(-1); });
    const result = await answerQuestion(options(fake.records, provider));
    assert.equal(fake.calls.length, 0); assert.ok(JSON.parse(secondInput.output).error); assert.equal(result.pending, undefined);
  }
});

test("denied job reads return no source and no pending note", async () => {
  const fake = fakeRecords({ missing: true });
  const provider = scripted([{ output: [call("get_job", { jobId: "foreign-job" })] }, output("That job is unavailable.")]);
  const result = await answerQuestion(options(fake.records, provider));
  assert.deepEqual(result.sources, []); assert.equal(result.pending, undefined);
});

test("an exact note proposal returns a bound token and stops before another model round or save", async () => {
  const fake = fakeRecords(); const text = "Installed the supplied fixture.";
  const provider = scripted([{ output: [call("propose_activity_note", { jobId: "job-a", text })] }]);
  const result = await answerQuestion(options(fake.records, provider, `Record this activity: ${text}`));
  assert.equal(result.pending?.kind, "log_activity"); assert.match(result.pending!.summary, /Smith · 123 Example Lane/);
  assert.ok(result.pending!.summary.endsWith(text));
  const note = verifyNoteToken(result.pending!.token, actor, secret);
  assert.equal(note.text, text); assert.equal(note.jobId, "job-a");
  assert.deepEqual(fake.calls, [["job", "job-a"]]);
  assert.match(result.reply, /before it is saved/);
});

test("invented quantities, assistant-history notes, closed jobs and locked companies cannot get review tokens", async () => {
  for (const variant of ["invented", "assistant-history", "closed", "locked"]) {
    const fake = fakeRecords({ status: variant === "closed" ? "completed" : undefined });
    const text = "Used 20 feet of wire and worked 8 hours.";
    const provider = scripted([{ output: [call("propose_activity_note", { jobId: "job-a", text })] }, output("Please provide the exact activity note or ask the office.")]);
    const opt = options(fake.records, provider, ["closed", "locked"].includes(variant) ? `Record: ${text}` : "Please record some work.");
    if (variant === "locked") opt.actor = { ...actor, locked: true };
    if (variant === "assistant-history") opt.messages = [{ role: "assistant", content: text }, ...opt.messages];
    const result = await answerQuestion(opt);
    assert.equal(result.pending, undefined);
  }
});

test("a model cannot remove a negation or select an earlier report when proposing a note", async () => {
  const report = "I have not installed the fixture.";
  for (const variant of ["negation", "correction"]) {
    const fake = fakeRecords();
    const proposed = variant === "negation" ? "installed the fixture." : "I installed the fixture.";
    const provider = scripted([{ output: [call("propose_activity_note", { jobId: "job-a", text: proposed })] }, output("Please send the exact full note you want recorded.")]);
    const opt = options(fake.records, provider, `Record this note: ${report}`);
    if (variant === "correction") opt.messages.unshift({ role: "user", content: proposed }, { role: "assistant", content: "Please review." });
    const result = await answerQuestion(opt);
    assert.equal(result.pending, undefined);
  }
});

test("workflow links are allow-listed and prohibited roles never receive them", async () => {
  for (const [role, workflow] of [["technician", "schedule"], ["technician", "audit"], ["apprentice", "estimates"], ["apprentice", "invoices"], ["owner", "clock"], ["admin", "materials"], ["apprentice", "clock"]]) {
    const fake = fakeRecords(); let toolResult: any;
    const provider = scripted([{ output: [call("open_workflow", { workflow, jobId: "" })] }, output("Ask the office.")], input => { const last = input.at(-1) as any; if (last?.type === "function_call_output") toolResult = JSON.parse(last.output); });
    const result = await answerQuestion({ ...options(fake.records, provider), actor: { ...actor, role } });
    assert.ok(toolResult.error); assert.deepEqual(result.sources, []);
  }
});

test("field workflows require authorized job reads and only return links with execution false", async () => {
  const fake = fakeRecords(); let toolResult: any;
  const provider = scripted([{ output: [call("open_workflow", { workflow: "materials", jobId: "job-a" })] }, output("Use the material request form.")], input => { const last = input.at(-1) as any; if (last?.type === "function_call_output") toolResult = JSON.parse(last.output); });
  const result = await answerQuestion(options(fake.records, provider));
  assert.equal(toolResult.executed, false); assert.match(toolResult.requirements, /photo.*GPS/);
  assert.equal(result.sources[0].href, "/tm/tech/jobs/job-a/request-materials");
  assert.deepEqual(fake.calls, [["job", "job-a"]]);
});

test("runaway tools, empty output and endless tool rounds fail with bounded errors", async () => {
  const fake = fakeRecords();
  await assert.rejects(answerQuestion(options(fake.records, scripted([{ output: [] }]))), AssistantError);
  await assert.rejects(answerQuestion(options(fake.records, scripted([{ output: Array.from({ length: 11 }, (_, i) => call("search_jobs", { query: "Smith" }, String(i))) }]))), /narrow your question/);
  let rounds = 0;
  await assert.rejects(answerQuestion(options(fake.records, async () => { rounds++; return { output: [call("search_jobs", { query: "Smith" }, String(rounds))] }; })), /narrow your question/);
  assert.equal(rounds, 4);
});
