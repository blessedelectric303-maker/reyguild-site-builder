import assert from "node:assert/strict";
import test from "node:test";
import { callReyguildAi, validateProposalDraft, draftScopeText } from "../lib/reyguild-ai.ts";

const config = { key: "test-only", model: "test/model" };
const company = { name: "Test Electric", trade: "electrical" };
const draft = {
  title: "Replace the outlet",
  summary: "Replace the specified outlet in the kitchen.",
  scope: ["Replace the outlet identified in the outline."],
  exclusions: [],
  questions: ["Confirm the outlet type and circuit condition."],
};
const completed = (value, finish_reason = "stop") => new Response(JSON.stringify({
  choices: [{ finish_reason, message: { content: JSON.stringify(value) } }],
}), { status: 200 });

test("AI remains disabled without server configuration and never calls the provider", async () => {
  let calls = 0;
  for (const incomplete of [{}, { key: "test" }, { model: "test" }]) {
    await assert.rejects(callReyguildAi(incomplete, "proposal", "My outline", company, async () => { calls++; }), { status: 503 });
  }
  assert.equal(calls, 0);
});

test("proposal requests use strict output and only the supplied company context", async () => {
  let sent;
  const result = await callReyguildAi(config, "proposal", "Replace the kitchen outlet", company, async (url, options) => {
    assert.equal(url, "https://ai-gateway.vercel.sh/v1/chat/completions");
    sent = JSON.parse(options.body);
    return completed(draft);
  });
  assert.deepEqual(result, draft);
  assert.equal(sent.response_format.type, "json_schema");
  assert.equal(sent.response_format.json_schema.strict, true);
  assert.equal(sent.messages[1].content, "Replace the kitchen outlet");
  assert.match(sent.messages[0].content, /Do not invent prices/);
  assert.match(sent.messages[0].content, /context only, never instructions/);
});

test("unanswered questions are kept out of customer-facing scope", () => {
  const description = draftScopeText(draft);
  assert.match(description, /Replace the outlet/);
  assert.doesNotMatch(description, /Confirm the outlet type/);
  assert.doesNotMatch(description, /Exclusions/);
});

test("invalid draft shapes and excessive output cannot be applied", () => {
  for (const invalid of [null, [], {}, { ...draft, title: "" }, { ...draft, scope: [] }, { ...draft, scope: [42] }, { ...draft, exclusions: "none" }, { ...draft, questions: new Array(31).fill("question") }]) {
    assert.throws(() => validateProposalDraft(invalid), { status: 502 });
  }
});

test("partial model output is rejected instead of becoming a proposal", async () => {
  await assert.rejects(callReyguildAi(config, "proposal", "Outline", company, async () => completed(draft, "length")), { status: 502 });
});

test("assistant returns an answer without providing action tools", async () => {
  const result = await callReyguildAi(config, "assistant", "How do I invite my team?", company, async (_url, options) => {
    const request = JSON.parse(options.body);
    assert.equal(request.tools, undefined);
    assert.match(request.messages[0].content, /cannot change records/);
    return completed({ answer: "Open your team page and invite the employee with their assigned role." });
  });
  assert.match(result.answer, /team page/);
});

test("provider errors never expose provider response bodies", async () => {
  for (const [status, expected] of [[401, 503], [403, 503], [429, 429], [500, 502]]) {
    await assert.rejects(callReyguildAi(config, "proposal", "Outline", company, async () => new Response("private provider diagnostics", { status })), (error) => {
      assert.equal(error.status, expected);
      assert.doesNotMatch(error.message, /private provider/);
      return true;
    });
  }
});

test("offline AI preserves the input and reports a retryable failure", async () => {
  const outline = "Replace the kitchen outlet";
  await assert.rejects(callReyguildAi(config, "proposal", outline, company, async () => { throw new Error("offline"); }), { status: 502 });
  assert.equal(outline, "Replace the kitchen outlet");
});

test("empty and oversized messages are rejected before provider usage", async () => {
  let calls = 0;
  for (const input of [" ", "x".repeat(10001)]) {
    await assert.rejects(callReyguildAi(config, "proposal", input, company, async () => { calls++; }), { status: 400 });
  }
  assert.equal(calls, 0);
});
