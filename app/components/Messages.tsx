"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Contact = { user_id: string; role: string; email: string };
type Msg = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

function roleLabel(r: string): string {
  if (r === "sales_rep") return "Sales Rep";
  return r.charAt(0).toUpperCase() + r.slice(1);
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function Messages({ userId, companyId }: { userId: string; companyId?: string }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sel, setSel] = useState<Contact | null>(null);
  const [thread, setThread] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  const loadUnread = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.schema("suite").from("messages").select("sender_id").eq("recipient_id", userId).is("read_at", null);
    const map: Record<string, number> = {};
    (data || []).forEach((m: any) => {
      map[m.sender_id] = (map[m.sender_id] || 0) + 1;
    });
    setUnread(map);
  }, [supabase, userId]);

  const loadContacts = useCallback(async () => {
    const { data } = await supabase.schema("suite").rpc("messageable_members");
    setContacts((data as Contact[]) || []);
  }, [supabase]);

  const loadThread = useCallback(
    async (contact: Contact) => {
      const { data } = await supabase.schema("suite").from("messages").select("id,sender_id,recipient_id,body,created_at,read_at").or("sender_id.eq." + contact.user_id + ",recipient_id.eq." + contact.user_id).order("created_at");
      setThread((data as Msg[]) || []);
      await supabase.schema("suite").from("messages").update({ read_at: new Date().toISOString() }).eq("recipient_id", userId).eq("sender_id", contact.user_id).is("read_at", null);
      loadUnread();
    },
    [supabase, userId, loadUnread]
  );

  useEffect(() => {
    loadUnread();
    const t = setInterval(loadUnread, 12000);
    return () => clearInterval(t);
  }, [loadUnread]);

  useEffect(() => {
    if (open) loadContacts();
  }, [open, loadContacts]);

  useEffect(() => {
    if (!open || !sel) return;
    const t = setInterval(() => loadThread(sel), 5000);
    return () => clearInterval(t);
  }, [open, sel, loadThread]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function close() {
    setOpen(false);
    setSel(null);
    setText("");
  }

  async function selectContact(c: Contact) {
    setSel(c);
    setThread([]);
    await loadThread(c);
  }

  async function send() {
    if (!sel || !companyId || sending) return;
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const { data, error } = await supabase.schema("suite").from("messages").insert({ company_id: companyId, sender_id: userId, recipient_id: sel.user_id, body }).select("id,sender_id,recipient_id,body,created_at,read_at").single();
    setSending(false);
    if (error) {
      alert("Couldn't send that message: " + error.message);
      return;
    }
    if (data) {
      setThread((t) => [...t, data as Msg]);
      setText("");
    }
  }

  const mailIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
  );

  const closeIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Messages" className="relative inline-flex items-center gap-1.5 rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800">
        {mailIcon}
        <span className="hidden sm:inline">Messages</span>
        {totalUnread > 0 ? <span className="absolute -top-1.5 -right-1.5 min-w-[18px] rounded-full px-1 text-center text-[11px] font-bold text-slate-900" style={{ background: "#e0a82e" }}>{totalUnread}</span> : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 sm:items-center" onClick={close}>
          <div className="mt-10 flex h-[70vh] max-h-[560px] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:mt-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2">
                {sel ? (
                  <button type="button" onClick={() => setSel(null)} aria-label="Back" className="rounded-md px-1 text-slate-300 hover:text-white">&larr;</button>
                ) : null}
                <span className="text-sm font-bold text-white">{sel ? sel.email : "Messages"}</span>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white">{closeIcon}</button>
            </div>

            {!sel ? (
              <div className="flex-1 overflow-y-auto p-2">
                {contacts.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-400">No teammates yet. Invite your team from Settings then Army, and they will show up here to message.</div>
                ) : (
                  contacts.map((c) => (
                    <button type="button" key={c.user_id} onClick={() => selectContact(c)} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left hover:bg-slate-800">
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-slate-100">{c.email}</span>
                        <span className="block text-xs text-slate-500">{roleLabel(c.role)}</span>
                      </span>
                      {unread[c.user_id] ? <span className="ml-2 min-w-[18px] rounded-full px-1 text-center text-[11px] font-bold text-slate-900" style={{ background: "#e0a82e" }}>{unread[c.user_id]}</span> : null}
                    </button>
                  ))
                )}
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {thread.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500">No messages yet. Say hello.</div>
                  ) : (
                    thread.map((m) => {
                      const mine = m.sender_id === userId;
                      const rowCls = "flex " + (mine ? "justify-end" : "justify-start");
                      const bubbleCls = "max-w-[80%] rounded-2xl px-3 py-2 text-sm " + (mine ? "text-slate-900" : "bg-slate-800 text-slate-100");
                      return (
                        <div key={m.id} className={rowCls}>
                          <div className={bubbleCls} style={mine ? { background: "#e0a82e" } : undefined}>
                            <div className="whitespace-pre-wrap break-words">{m.body}</div>
                            <div className={"mt-0.5 text-[10px] " + (mine ? "text-amber-900/70" : "text-slate-500")}>{timeLabel(m.created_at)}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>
                <div className="flex items-center gap-2 border-t border-slate-800 p-3">
                  <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Type a message" className="flex-1 rounded-full bg-slate-800 border border-slate-700 px-4 py-2 text-sm text-slate-100" />
                  <button type="button" onClick={send} disabled={sending || !text.trim()} className="rounded-full px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50" style={{ background: "#e0a82e" }}>Send</button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
