"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ROLE_ORDER, ROLE_LABELS, normalizeRole } from "@/utils/roles";

type Member = {
  email?: string;
  // Name and phone live on the MEMBERSHIP, not the login - the same person
  // could be in two companies, and what each calls him is their business.
  full_name?: string | null;
  phone?: string | null;
  is_me?: boolean; id: string; user_id: string; role: string };
type Invite = {
  id: string;
  email: string;
  role: string;
  token: string;
  status: string;
};

const ROLES = ROLE_ORDER.map((k) => ({ key: k, label: ROLE_LABELS[k] }));

function roleLabel(r: string) {
  return ROLE_LABELS[normalizeRole(r)] || r;
}

export default function TeamManager({
  companyName,
  companyId,
  armyMode,
  ownerIsAdmin,
  members,
  invites: initialInvites,
}: {
  companyName: string;
  companyId: string;
  armyMode: boolean;
  ownerIsAdmin: boolean;
  members: Member[];
  invites: Invite[];
}) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("tech");
  const [invites, setInvites] = useState<Invite[]>(initialInvites);
  const [team, setTeam] = useState<any[]>(members as any[]);
  const [saving, setSaving] = useState<string | null>(null);

  async function changeRole(userId: string, next: string) {
    setSaving(userId);
    const { error } = await supabase
      .schema("suite")
      .rpc("set_member_role", { target_user: userId, new_role: next });
    setSaving(null);
    if (error) {
      alert(error.message);
      return;
    }
    setTeam(team.map((t) => (t.user_id === userId ? { ...t, role: next } : t)));
  }
  // Editing a person's name and number. Without this the app fell back to
  // the part of an email before the @, which is how a tech ends up shown to
  // his own crew as "benp".
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [detailErr, setDetailErr] = useState<string | null>(null);

  function startEdit(m: Member) {
    setEditing(m.user_id);
    setDraftName(m.full_name || "");
    setDraftPhone(m.phone || "");
    setDetailErr(null);
  }

  async function saveDetails(userId: string) {
    setSaving(userId);
    setDetailErr(null);
    const { error } = await supabase
      .schema("suite")
      .rpc("set_member_details", {
        target_user: userId,
        p_name: draftName,
        p_phone: draftPhone,
      });
    setSaving(null);
    if (error) {
      setDetailErr(error.message);
      return;
    }
    setTeam(team.map((t) =>
      t.user_id === userId ? { ...t, full_name: draftName, phone: draftPhone } : t));
    setEditing(null);
  }

  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [army, setArmy] = useState(armyMode);
  const [ownerAdmin, setOwnerAdmin] = useState(ownerIsAdmin);

  async function toggleArmy() {
    const v = !army;
    setArmy(v);
    await supabase.schema("suite").from("companies").update({ army_mode: v }).eq("id", companyId);
  }
  async function toggleOwnerAdmin() {
    const v = !ownerAdmin;
    setOwnerAdmin(v);
    await supabase.schema("suite").from("companies").update({ owner_is_admin: v }).eq("id", companyId);
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const [note, setNote] = useState("");

  // The invite is made on the server, which also emails it. Doing it from
  // here used to write the row and stop - no email, and nobody could tell.
  async function createInvite() {
    if (!email.trim()) return;
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const json = await res.json().catch(() => ({}));
      setBusy(false);
      if (!res.ok) {
        setNote(json.error || "Could not create the invite.");
        return;
      }
      if (json.invite) {
        setInvites([json.invite as Invite, ...invites]);
        setNote(
          json.emailed
            ? "Invite emailed to " + email.trim() + "."
            : "Invite created, but the email did not go out. Use Copy link and send it yourself."
        );
        setEmail("");
      }
    } catch (e) {
      setBusy(false);
      setNote("No connection. The invite was not created.");
    }
  }

  async function revoke(id: string) {
    await supabase
      .schema("suite")
      .from("invites")
      .update({ status: "revoked" })
      .eq("id", id);
    setInvites(invites.filter((i) => i.id !== id));
  }

  function copyLink(token: string) {
    // Whatever address this page is open on - the old hard-coded preview
    // address here was handing people a link to a frozen build.
    const link = (origin || "https://tm.serviceopspro.com") + "/join/" + token;
    navigator.clipboard.writeText(link);
    setCopied(token);
    setTimeout(() => setCopied(""), 1500);
  }

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-2xl mx-auto">
        <a href="/" className="text-sm text-slate-400 hover:text-white">
          &larr; Back to command center
        </a>
        <h1 className="mt-4 text-2xl font-bold text-white">
          {companyName} &middot; Team
        </h1>
        {/* How many people are on this company - the number the office is
            billed on, and the first thing anybody asks. */}
        <p className="mt-1 text-sm font-semibold" style={{ color: "#CC9000" }}>
          {team.length} {team.length === 1 ? "person" : "people"} on this company
          {invites.length > 0
            ? " \u00b7 " + invites.length + " invite" + (invites.length === 1 ? "" : "s") + " waiting"
            : ""}
        </p>
        <p className="text-slate-400 text-sm mt-1">
          Add people and send them an invite link. The moment someone joins, your
          account switches from One Man Army to Army Mode.
        </p>

        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/50 p-5">
          <h2 className="text-white font-semibold mb-3">Company settings</h2>
          <div className="flex items-center justify-between gap-3 py-2">
            <div>
              <div className="text-slate-100 text-sm font-medium">Mode</div>
              <div className="text-slate-400 text-xs">One Man Army = just you. Army Mode = you and your team.</div>
            </div>
            <button onClick={toggleArmy} className={"shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold " + (army ? "text-slate-900" : "text-slate-200 border border-slate-600")} style={army ? { background: "#34d399" } : {}}>{army ? "Army Mode" : "One Man Army"}</button>
          </div>
          <div className="flex items-center justify-between gap-3 py-2 border-t border-slate-800">
            <div>
              <div className="text-slate-100 text-sm font-medium">Owner &amp; Admin</div>
              <div className="text-slate-400 text-xs">Combined = the owner also has admin powers. Separate = two distinct roles.</div>
            </div>
            <button onClick={toggleOwnerAdmin} className={"shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold " + (ownerAdmin ? "text-slate-900" : "text-slate-200 border border-slate-600")} style={ownerAdmin ? { background: "#CC9000" } : {}}>{ownerAdmin ? "Combined" : "Separate"}</button>
          </div>
        </div>

        {/* READ THIS BEFORE INVITING ANYONE. The documents your people sign
            carry your company name, pulled from Settings. Invite somebody with
            Settings half empty and they sign paperwork with your own name on
            it instead of the business. */}
        <div className="mt-6 rounded-xl border p-5" style={{ borderColor: "#CC9000", background: "rgba(204,144,0,.08)" }}>
          <h2 className="font-semibold" style={{ color: "#F0CE7A" }}>
            Before you invite anybody
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">
            <strong>Fill in your company details first.</strong> Your name,
            logo, address and phone go straight onto every document your people
            sign. If they are not filled in, your employees sign paperwork with
            your own name on it rather than the company&rsquo;s.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">
            <strong>Read what you are handing them.</strong> We have written the
            whole set for you - conduct, safety, drug and alcohol, harassment,
            non-solicit, company property and the rest - with your company named
            throughout. They are yours: read them, change the wording, or add
            your own. Whatever they say on the day somebody signs is what they
            signed.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/company" className="rounded-md px-3 py-2 text-sm font-semibold text-slate-900" style={{ background: "#CC9000" }}>
              Company details
            </a>
            <a href="/tm/tech/documents" className="rounded-md border border-slate-500 px-3 py-2 text-sm font-semibold text-slate-200">
              Read and edit the documents
            </a>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/50 p-5">
          <h2 className="text-white font-semibold mb-3">Invite someone</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="their@email.com"
              className="flex-1 rounded-md bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100 text-sm"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-md bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
            <button
              onClick={createInvite}
              disabled={busy}
              className="rounded-md px-4 py-2 text-sm font-semibold text-slate-900"
              style={{ background: "#CC9000" }}
            >
              {busy ? "..." : "Send invite"}
            </button>
          </div>
          {note ? <p className="mt-2 text-sm text-slate-300">{note}</p> : null}
        </div>

        {invites.length > 0 && (
          <div className="mt-6">
            <h2 className="text-white font-semibold mb-3">Pending invites</h2>
            <div className="flex flex-col gap-2">
              {invites.map((i) => (
                <div
                  key={i.id}
                  className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="text-sm">
                    <span className="text-slate-100">{i.email}</span>
                    <span className="text-amber-300 ml-2">
                      {roleLabel(i.role)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyLink(i.token)}
                      className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                    >
                      {copied === i.token ? "Copied!" : "Copy invite link"}
                    </button>
                    <button
                      onClick={() => revoke(i.id)}
                      className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <h2 className="text-white font-semibold mb-3">
            Your team ({team.length})
          </h2>
          <div className="flex flex-col gap-2">
            {team.map((m) => (
              <div key={m.id} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {editing === m.user_id ? (
                    <div className="space-y-2">
                      <input
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        placeholder="Full name"
                        className="w-full rounded-md bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-slate-100"
                      />
                      <input
                        value={draftPhone}
                        onChange={(e) => setDraftPhone(e.target.value)}
                        placeholder="Phone"
                        inputMode="tel"
                        className="w-full rounded-md bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-slate-100"
                      />
                      {detailErr ? <p className="text-xs text-red-400">{detailErr}</p> : null}
                      <div className="flex gap-2">
                        <button type="button" disabled={saving === m.user_id}
                          onClick={() => saveDetails(m.user_id)}
                          className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                          {saving === m.user_id ? "Saving..." : "Save"}
                        </button>
                        <button type="button" onClick={() => setEditing(null)}
                          className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-bold text-slate-300">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => startEdit(m)} className="block w-full text-left">
                      <div className="truncate text-sm font-semibold text-slate-100">
                        {m.full_name || <span className="text-slate-400">Add a name</span>}
                      </div>
                      <div className="truncate text-xs text-slate-400">{m.email || "(no email)"}</div>
                      {m.phone ? <div className="text-xs text-slate-400">{m.phone}</div> : null}
                      {m.is_me ? <div className="text-xs text-slate-500">you</div> : null}
                    </button>
                  )}
                </div>
                {m.is_me ? (
                  <span className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-400">{roleLabel(m.role)}</span>
                ) : (
                  <select
                    value={m.role}
                    disabled={saving === m.user_id}
                    onChange={(e) => changeRole(m.user_id, e.target.value)}
                    className="rounded-md bg-slate-800 border border-slate-600 px-3 py-1.5 text-slate-100 text-sm disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r.key} value={r.key}>{r.label}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
