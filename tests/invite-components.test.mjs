// Offline component-flow tests. React hooks and Supabase are mocked; no network
// requests, accounts, emails, invite acceptances, or database writes are made.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as inviteFlow from '../lib/invite-flow.ts';

function harness(file, client, props = {}, fetch = async () => { throw Error('Unexpected fetch'); }) {
  const slots = [];
  const effects = [];
  let cursor = 0;
  let tree;
  const hooks = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { current: initial };
      return slots[i];
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!(i in slots) || deps.some((dep, at) => dep !== slots[i][at])) effects.push(fn);
      slots[i] = deps;
    },
  };
  const window = { location: { search: '', origin: 'https://reyguild.test', href: '', reload() {} } };
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const timers = new Map();
  let timerId = 0;
  vm.runInNewContext(source, {
    module, exports: module.exports, window, URLSearchParams, fetch,
    setTimeout: fn => { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout: id => timers.delete(id),
    require(name) {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return {
        jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'fragment',
      };
      if (name === '@/utils/supabase/client') return { createClient: () => client };
      if (name === '@/lib/invite-flow') return inviteFlow;
      if (name === '@/utils/roles') return { roleLabel: x => x };
      throw Error('Unexpected import: ' + name);
    },
  });
  const render = () => { cursor = 0; tree = module.exports.default(props); return tree; };
  function flatten(node = tree) {
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (!node || typeof node !== 'object') return [];
    return [node, ...flatten(node.props?.children ?? null)];
  }
  function text(node) {
    if (Array.isArray(node)) return node.map(text).join('');
    if (node === null || node === undefined || typeof node === 'boolean') return '';
    if (typeof node !== 'object') return String(node);
    return text(node.props?.children);
  }
  const button = label => flatten().findLast(node => node.type === 'button' && text(node) === label);
  const input = placeholder => flatten().find(node => node.type === 'input' && node.props.placeholder === placeholder);
  const change = (placeholder, value) => { input(placeholder).props.onChange({ target: { value } }); render(); };
  render();
  return { render, button, input, change, flatten, text: () => text(tree), effects, timers, window };
}

const denied = { code: '42501', message: 'permission denied' };
const user = { id: 'user-1', email: 'person@example.com' };
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };

function loginClient({ lookup = async () => ({ data: [], error: denied }), membership, signUp, reset } = {}) {
  const calls = { signup: 0, signin: 0, lookup: 0, membership: 0, reset: 0 };
  const client = {
    auth: {
      async signInWithPassword() { calls.signin++; return { data: { user }, error: null }; },
      async signUp(...args) { calls.signup++; return signUp ? signUp(...args) : { data: { session: null, user }, error: null }; },
      async resetPasswordForEmail(...args) { calls.reset++; return reset ? reset(...args) : { error: null }; },
    },
    schema() { return {
      rpc() { calls.lookup++; return lookup(); },
      from() { return { select() { return { eq(column, id) {
        assert.equal(column, 'user_id'); assert.equal(id, user.id);
        return { limit() { return { async maybeSingle() {
          calls.membership++; return membership || { data: null, error: null };
        } }; } };
      } }; } }; },
    }; },
  };
  return { client, calls };
}

function signupMode(h) {
  h.button('Sign up').props.onClick(); h.render();
  h.change('Email', user.email); h.change('Password', 'secure-password');
  h.flatten().find(node => node.type === 'input' && node.props.type === 'checkbox').props.onChange({ target: { checked: true } });
  h.render();
}

test('login signup never calls signUp after denied, malformed or rejected invite lookup', async () => {
  for (const lookup of [
    async () => ({ data: [], error: denied }),
    async () => ({ data: null, error: null }),
    async () => { throw Error('offline'); },
  ]) {
    const { client, calls } = loginClient({ lookup });
    const h = harness('app/login/page.tsx', client);
    signupMode(h);
    await h.button('Create account').props.onClick(); h.render();
    assert.equal(calls.signup, 0); assert.equal(h.window.location.href, '');
    assert.equal(h.button('Create account').props.disabled, false);
    assert.match(h.text(), /paused|couldn't check/);
  }
});

test('verified existing member signs in while lookup is paused; ambiguous membership cannot redirect', async () => {
  for (const membership of [
    { data: { user_id: user.id, company_id: 'company-1' }, error: null },
    { data: { user_id: user.id, company_id: 'company-1' }, error: denied },
    { data: { user_id: 'different-user', company_id: 'company-1' }, error: null },
    { data: null, error: null },
  ]) {
    const { client, calls } = loginClient({ membership });
    const h = harness('app/login/page.tsx', client);
    h.window.location.search = '?next=/tm/enter';
    await h.button('Sign in').props.onClick(); h.render();
    assert.equal(calls.membership, 1);
    const admitted = !membership.error && membership.data?.user_id === user.id;
    assert.equal(h.window.location.href, admitted ? '/tm/enter' : '');
    if (!admitted) assert.match(h.text(), /temporarily paused/);
    assert.equal(calls.signup, 0);
  }
});

test('password reset handles rejection, blocks rapid clicks and allows a retry', async () => {
  let reject;
  const pending = new Promise((_, no) => { reject = no; });
  const { client, calls } = loginClient({ reset: () => pending });
  const h = harness('app/login/page.tsx', client);
  h.button('Forgot password?').props.onClick(); h.render();
  const submit = h.button('Send reset link').props.onClick;
  const first = submit();
  await submit(); await submit();
  assert.equal(calls.reset, 1);
  reject(Error('offline')); await first; h.render();
  assert.equal(h.button('Send reset link').props.disabled, false);
  assert.match(h.text(), /check your connection/);
  client.auth.resetPasswordForEmail = async () => ({ error: null });
  await h.button('Send reset link').props.onClick(); h.render();
  assert.match(h.text(), /reset link is on its way/);
});

test('owner signup stops on failed company setup and switches to sign-in for retry', async () => {
  const { client, calls } = loginClient({
    lookup: async () => ({ data: [], error: null }),
    signUp: async () => ({ data: { user, session: {} }, error: null }),
  });
  const h = harness('app/login/page.tsx', client, {}, async () => { throw Error('offline'); });
  signupMode(h);
  await h.button('Create account').props.onClick(); h.render();
  assert.equal(calls.signup, 1); assert.equal(h.window.location.href, '');
  assert.match(h.text(), /login is ready/); assert.ok(h.button('Sign in'));
  assert.equal(h.button('Create account'), undefined);
});

function acceptClient({ signedIn = true, accept = async () => ({ error: denied }), preview } = {}) {
  const calls = { signup: 0, accept: 0 };
  const row = { email: user.email, status: 'pending', company_name: 'Test Company', role: 'tech' };
  return { calls, client: {
    auth: {
      async getUser() { return { data: { user: signedIn ? user : null }, error: null }; },
      async signUp() { calls.signup++; return { data: { user, session: {} }, error: null }; },
    },
    schema() { return { rpc(name) {
      if (name === 'invite_preview') return preview ? preview() : Promise.resolve({ data: [row], error: null });
      if (name === 'accept_invite') { calls.accept++; return accept(); }
      throw Error('Unexpected RPC: ' + name);
    } }; },
  } };
}

async function loadAccept(options) {
  const mock = acceptClient(options);
  const h = harness('app/join/[token]/Accept.tsx', mock.client, { token: 'token-1' });
  const cleanup = h.effects.shift()();
  await flush(); h.render();
  return { h, cleanup, ...mock };
}

test('signed-in invite permission denial shows paused state and no misleading invalid link or redirect', async () => {
  const { h, calls } = await loadAccept();
  assert.match(h.text(), /temporarily paused/);
  assert.doesNotMatch(h.text(), /not valid|Checking your invite/);
  assert.equal(h.window.location.href, ''); assert.equal(calls.accept, 1);
});

test('invite preview network failure clears loading and offers retry', async () => {
  const { h, calls } = await loadAccept({ preview: async () => { throw Error('offline'); } });
  assert.match(h.text(), /check your connection/); assert.ok(h.button('Try again'));
  assert.doesNotMatch(h.text(), /Checking your invite/); assert.equal(calls.accept, 0);
});

test('new invited account does not offer signup again when acceptance is paused', async () => {
  const { h, calls } = await loadAccept({ signedIn: false });
  h.change('First and last name', 'Test Person'); h.change('At least 8 characters', 'secure-password');
  const submit = h.button('Create my password').props.onClick;
  const first = submit(); await submit(); await first; h.render();
  assert.equal(calls.signup, 1); assert.equal(calls.accept, 1);
  assert.match(h.text(), /Your login is ready.*temporarily paused/);
  assert.equal(h.button('Create my password'), undefined);
  assert.equal(h.window.location.href, '');
});

test('successful acceptance shows completion and its pending redirect is cancelled on unmount', async () => {
  const { h, cleanup } = await loadAccept({ accept: async () => ({ error: null }) });
  assert.match(h.text(), /You're in/); assert.doesNotMatch(h.text(), /Checking your invite/);
  assert.equal(h.timers.size, 1); cleanup(); assert.equal(h.timers.size, 0);
});

test('React effect replay shares an in-flight acceptance instead of consuming twice', async () => {
  let resolve;
  const pending = new Promise(yes => { resolve = yes; });
  const mock = acceptClient({ accept: () => pending });
  const h = harness('app/join/[token]/Accept.tsx', mock.client, { token: 'token-1' });
  const effect = h.effects.shift();
  const cleanup = effect(); await flush();
  assert.equal(mock.calls.accept, 1); cleanup();
  effect(); await flush(); assert.equal(mock.calls.accept, 1);
  resolve({ error: null }); await flush(); h.render();
  assert.match(h.text(), /You're in/);
});

test('login keeps normal sign-in and invitation redirects, including safe external next fallback', async () => {
  for (const [data, next, expected] of [
    [[], '/onboarding', '/onboarding'],
    [[], '//evil.test', '/'],
    [[{ token: 'invite-1' }], '/tm/enter', '/join/invite-1'],
  ]) {
    const { client, calls } = loginClient({ lookup: async () => ({ data, error: null }) });
    const h = harness('app/login/page.tsx', client);
    h.window.location.search = '?next=' + encodeURIComponent(next);
    await h.button('Sign in').props.onClick();
    assert.equal(h.window.location.href, expected);
    assert.equal(calls.membership, 0);
  }
});

test('signup follows an existing invitation without creating an owner account', async () => {
  const { client, calls } = loginClient({ lookup: async () => ({ data: [{ token: 'invite-1' }], error: null }) });
  const h = harness('app/login/page.tsx', client);
  signupMode(h); await h.button('Create account').props.onClick();
  assert.equal(calls.signup, 0); assert.equal(h.window.location.href, '/join/invite-1');
});

test('successful owner signup requires successful company creation before redirecting', async () => {
  const { client, calls } = loginClient({
    lookup: async () => ({ data: [], error: null }),
    signUp: async () => ({ data: { user, session: {} }, error: null }),
  });
  let companyCalls = 0;
  const h = harness('app/login/page.tsx', client, {}, async (url, options) => {
    assert.equal(url, '/api/start-company'); assert.equal(options.method, 'POST'); companyCalls++;
    return { ok: true, async json() { return { ok: true, company_id: 'company-1' }; } };
  });
  signupMode(h); await h.button('Create account').props.onClick(); h.render();
  assert.equal(calls.signup, 1); assert.equal(companyCalls, 1); assert.equal(h.window.location.href, '/');
  assert.equal(h.button('Please wait...').props.disabled, true);
});

test('invite for another email cannot be accepted by the signed-in owner', async () => {
  const { h, calls } = await loadAccept({ preview: async () => ({
    data: [{ email: 'other@example.com', status: 'pending', company_name: 'Test Company' }], error: null,
  }) });
  assert.equal(calls.accept, 0); assert.match(h.text(), /signed in as/);
  assert.equal(h.window.location.href, '');
});

test('guest invitation confirmation keeps the invite destination and does not try to accept without a session', async () => {
  const mock = acceptClient({ signedIn: false });
  mock.client.auth.signUp = async options => {
    mock.calls.signup++;
    assert.equal(options.email, user.email);
    assert.equal(new URL(options.options.emailRedirectTo).searchParams.get('next'), '/join/token-1');
    return { data: { user, session: null }, error: null };
  };
  const h = harness('app/join/[token]/Accept.tsx', mock.client, { token: 'token-1' });
  h.effects.shift()(); await flush(); h.render();
  h.change('First and last name', 'Test Person'); h.change('At least 8 characters', 'secure-password');
  await h.button('Create my password').props.onClick(); h.render();
  assert.equal(mock.calls.signup, 1); assert.equal(mock.calls.accept, 0);
  assert.match(h.text(), /Check your email/); assert.equal(h.button('Create my password'), undefined);
});
