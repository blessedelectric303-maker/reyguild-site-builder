"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./FieldAssistant.module.css";

type Message={role:"user"|"assistant";content:string};
type Source={label:string;href:string};
type Pending={token:string;summary:string;kind:"log_activity"};
type Recognition={lang:string;continuous:boolean;interimResults:boolean;onresult:((e:any)=>void)|null;onerror:((e:any)=>void)|null;onend:(()=>void)|null;start:()=>void;abort:()=>void};

export default function FieldAssistant() {
  const pathname=usePathname();
  const [available,setAvailable]=useState(false),[configured,setConfigured]=useState(false),[open,setOpen]=useState(false);
  const [consent,setConsent]=useState(false),[draft,setDraft]=useState(""),[messages,setMessages]=useState<Message[]>([]);
  const [sources,setSources]=useState<Source[]>([]),[pending,setPending]=useState<Pending|null>(null);
  const [busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState("");
  const [listening,setListening]=useState(false),[handsFree,setHandsFree]=useState(false),[voiceSupported,setVoiceSupported]=useState(false);
  const locked=useRef(false),readAbort=useRef<AbortController|null>(null),recognition=useRef<Recognition|null>(null);
  const generation=useRef(0),active=useRef(false),handsFreeRef=useRef(false),pendingRef=useRef<Pending|null>(null),readBack=useRef(false);
  const voiceGeneration=useRef(0);
  const currentPath=useRef(pathname);currentPath.current=pathname;
  const transcriptRef=useRef<Message[]>([]),input=useRef<HTMLTextAreaElement>(null),launcher=useRef<HTMLButtonElement>(null),panel=useRef<HTMLElement>(null);

  function stopVoice() {voiceGeneration.current++;recognition.current?.abort();recognition.current=null;setListening(false);window.speechSynthesis?.cancel();}
  useEffect(()=>{
    const hidden=/^\/(login|auth|join|reset-password|legal|onboarding|p)(\/|$)/.test(pathname);
    active.current=false;generation.current++;readAbort.current?.abort();stopVoice();setOpen(false);setConsent(false);setMessages([]);transcriptRef.current=[];setPending(null);pendingRef.current=null;setSources([]);setError("");setAvailable(false);setDraft("");
    const controller=new AbortController();
    if(!hidden) fetch("/api/assistant",{cache:"no-store",signal:controller.signal}).then(r=>r.json()).then(data=>{if(controller.signal.aborted)return;setAvailable(data.available===true);setConfigured(data.configured===true);}).catch(()=>{});
    const w=window as typeof window & {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
    setVoiceSupported(!!(w.SpeechRecognition||w.webkitSpeechRecognition));
    return()=>{controller.abort();active.current=false;readAbort.current?.abort();stopVoice();};
  },[pathname]);
  useEffect(()=>{pendingRef.current=pending;},[pending]);
  useEffect(()=>{handsFreeRef.current=handsFree;},[handsFree]);
  useEffect(()=>{if(open) input.current?.focus();},[open,consent]);

  function close() {
    active.current=false;generation.current++;readAbort.current?.abort();stopVoice();setOpen(false);readBack.current=false;launcher.current?.focus();
  }
  function say(text:string,canConfirm=false) {
    if(!handsFreeRef.current||!active.current||!window.speechSynthesis) return;
    recognition.current?.abort();setListening(false);window.speechSynthesis.cancel();
    const voiceVersion=++voiceGeneration.current,routeVersion=generation.current;
    const utterance=new SpeechSynthesisUtterance(text);
    utterance.onend=()=>{if(!active.current||voiceVersion!==voiceGeneration.current||routeVersion!==generation.current)return;readBack.current=canConfirm;if(handsFreeRef.current&&!locked.current)startVoice();};
    utterance.onerror=()=>{if(voiceVersion===voiceGeneration.current)readBack.current=false;};
    window.speechSynthesis.speak(utterance);
  }
  function cancelNote() {setPending(null);pendingRef.current=null;readBack.current=false;setError("");stopVoice();}
  async function confirmNote() {
    const note=pendingRef.current;
    if(!note||locked.current)return;
    locked.current=true;setSaving(true);setError("");stopVoice();
    const confirmPath=pathname;
    try {
      // A confirmation may commit even if the panel is closed. Do not abort or
      // automatically retry it. Preserve the same token on ambiguous failures.
      const response=await fetch("/api/assistant/confirm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:note.token,confirmed:true})});
      const data=await response.json();if(!response.ok||data.ok!==true)throw new Error(data.error||"Could not confirm the save. Retry this same note.");
      if(confirmPath===currentPath.current) {
        setPending(null);pendingRef.current=null;readBack.current=false;
        const next=[...transcriptRef.current,{role:"assistant" as const,content:data.message}];setMessages(next);transcriptRef.current=next;
        if(data.source)setSources([data.source]);say(data.message);
      }
    } catch(e) {if(confirmPath===currentPath.current)setError(e instanceof Error?e.message:"Save status is uncertain. Retry this same confirmation to avoid a duplicate.");}
    finally{locked.current=false;setSaving(false);}
  }
  async function send(raw=draft) {
    const content=raw.trim();if(!content||locked.current||!consent||!configured)return;
    if(pendingRef.current) {setError("Confirm or cancel the reviewed note before asking another question.");return;}
    locked.current=true;setBusy(true);setError("");stopVoice();setSources([]);setDraft("");
    const history=[...transcriptRef.current,{role:"user" as const,content}].slice(-15);
    while(history.reduce((n,m)=>n+m.content.length,0)>12000&&history.length>1)history.shift();
    setMessages(history);transcriptRef.current=history;
    const controller=new AbortController();readAbort.current=controller;const currentGeneration=generation.current;
    try {
      const response=await fetch("/api/assistant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:history,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC",consent:true}),signal:controller.signal});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"The assistant couldn't answer.");
      if(currentGeneration!==generation.current||!active.current)return;
      const next=[...history,{role:"assistant" as const,content:String(data.reply)}];setMessages(next);transcriptRef.current=next;setSources(data.sources||[]);
      if(data.pending){setPending(data.pending);pendingRef.current=data.pending;readBack.current=false;}
      locked.current=false;
      say(data.pending?`Review this activity note. ${data.pending.summary}. This records your report only. Say confirm to save it, or cancel.`:data.reply,!!data.pending);
    } catch(e) {if(!controller.signal.aborted&&currentGeneration===generation.current)setError(e instanceof Error?e.message:"The assistant couldn't answer. Try again.");}
    finally{locked.current=false;setBusy(false);}
  }
  function startVoice() {
    if(locked.current||!active.current||!consent||!configured)return;
    const w=window as typeof window & {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
    const Constructor=w.SpeechRecognition||w.webkitSpeechRecognition;if(!Constructor)return;
    stopVoice();setError("");const mic=new Constructor();recognition.current=mic;mic.lang="en-US";mic.continuous=false;mic.interimResults=false;
    mic.onresult=(event:any)=>{
      if(!active.current||recognition.current!==mic)return;
      const spoken=String(event.results?.[0]?.[0]?.transcript||"").trim();
      if(!spoken)return;
      if(pendingRef.current) {
        const command=spoken.toLowerCase().replace(/[.!?]$/g,"").trim();
        if(command==="cancel")cancelNote();
        else if(command==="confirm"&&readBack.current){void confirmNote();}
        else setError("Review the note and press Confirm, or turn on hands-free mode to hear it before saying confirm.");
      } else if(handsFreeRef.current)void send(spoken);else setDraft(spoken);
    };
    mic.onerror=(event:any)=>{if(active.current&&event.error!=="aborted")setError(event.error==="not-allowed"?"Microphone access was denied. You can still type or use phone-keyboard dictation.":"Voice input stopped. Try again or type your question.");};
    mic.onend=()=>{if(recognition.current===mic){recognition.current=null;setListening(false);}};
    try{mic.start();setListening(true);}catch{setError("Voice is unavailable in this browser. Type or use keyboard dictation.");}
  }
  function toggleHandsFree(value:boolean) {
    setHandsFree(value);handsFreeRef.current=value;stopVoice();
    readBack.current=false;
    if(value&&pendingRef.current){readBack.current=false;say(`Review this activity note. ${pendingRef.current.summary}. Say confirm to save it, or cancel.`,true);}
  }
  if(!available)return null;
  return <div className={styles.root}>
    {!open?<button ref={launcher} className={styles.launcher} onClick={()=>{active.current=true;setOpen(true);}} aria-label="Open ReyGuild assistant">✦ Assistant</button>:<section ref={panel} className={styles.panel} role="dialog" aria-modal="false" aria-labelledby="field-assistant-title" onKeyDown={e=>{if(e.key==="Escape")close();}}>
      <header className={styles.header}><strong id="field-assistant-title">ReyGuild Assistant</strong><button onClick={close} aria-label="Close assistant">×</button></header>
      <div className={styles.body}>
        {!configured?<p>AI is not enabled yet. The existing app is still available. An owner needs to finish the server setup before this assistant can answer.</p>:!consent?<div>
          <p>Ask about your authorized jobs, job descriptions and your hours. You can also review and save an activity note.</p>
          <p>Your questions and relevant authorized job records are sent to OpenAI. Voice dictation may use your browser’s speech service. Don’t enter passwords, payment details or private HR information.</p>
          <button className={styles.primary} onClick={()=>setConsent(true)}>Enable for this session</button>
        </div>:<>
          <p className={styles.hint}>Ask a question or say the exact activity note you want to record. Clock, materials and other workflows open their existing forms.</p>
          <div className={styles.messages} role="log" aria-live="polite">{messages.map((m,i)=><div key={i} className={m.role==="user"?styles.user:styles.answer}><small>{m.role==="user"?"You":"Assistant"}</small><p>{m.content}</p></div>)}</div>
          {sources.length>0&&<div className={styles.sources}>{sources.filter(s=>s.href.startsWith("/")&&!s.href.startsWith("//")).map(s=><a key={s.href} href={s.href}>{s.label}</a>)}</div>}
          {pending&&<div className={styles.review}><strong>Review activity note</strong><p>{pending.summary}</p><small>Records your report. Does not change time, materials, price or job status.</small><div className={styles.controls}><button className={styles.primary} onClick={()=>void confirmNote()} disabled={saving}>{saving?"Saving…":"Confirm and save"}</button><button onClick={cancelNote} disabled={saving}>Cancel</button></div></div>}
          {error&&<p className={styles.error} role="alert">{error}</p>}
          <form onSubmit={e=>{e.preventDefault();void send();}}><label className={styles.inputLabel} htmlFor="field-assistant-question">Question or exact note</label><textarea ref={input} id="field-assistant-question" maxLength={4000} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="What’s the description for the Smith job?" disabled={busy||saving||!!pending}/><div className={styles.controls}><button className={styles.primary} type="submit" disabled={!draft.trim()||busy||saving||!!pending}>{busy?"Checking records…":"Send"}</button>{voiceSupported&&<button type="button" onClick={listening?stopVoice:startVoice} disabled={busy||saving}>{listening?"Stop mic":"Speak"}</button>}</div></form>
          {voiceSupported?<label className={styles.handsFree}><input type="checkbox" checked={handsFree} onChange={e=>toggleHandsFree(e.target.checked)}/> Hands-free: send speech and read replies aloud</label>:<p className={styles.hint}>Type here or use your phone keyboard’s dictation.</p>}
          {listening&&<p role="status">Listening…</p>}
        </>}
      </div>
    </section>}
  </div>;
}
