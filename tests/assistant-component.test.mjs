import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual transpiled component with isolated React hooks, fetch,
// speech and navigation. Does not establish real layout/microphone support.
function fixture(fetcher) {
  const slots=[],effects=[],cleanups=[];let cursor=0,tree,pathname='/tm/tech';
  const hooks={
    useState(value){const i=cursor++;if(!(i in slots))slots[i]=value;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]},
    useRef(value){const i=cursor++;if(!(i in slots))slots[i]={current:value};return slots[i]},
    useEffect(fn,deps){const i=cursor++;if(!(i in slots)||deps.some((d,n)=>d!==slots[i][n]))effects.push(()=>{cleanups[i]?.();cleanups[i]=fn()});slots[i]=deps},
  };
  const voice={starts:0,last:null,utterance:null};
  class Mic {start(){voice.starts++;voice.last=this}abort(){this.onend?.()}}
  class Utterance {constructor(text){this.text=text}}
  const window={SpeechRecognition:Mic,speechSynthesis:{cancel(){},speak(u){voice.utterance=u}}};
  const module={exports:{}};
  const source=ts.transpileModule(fs.readFileSync(new URL('../components/FieldAssistant.tsx',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  vm.runInNewContext(source,{module,exports:module.exports,window,SpeechSynthesisUtterance:Utterance,AbortController,Intl,fetch:fetcher,require(name){
    if(name==='react')return hooks;if(name==='next/navigation')return{usePathname:()=>pathname};
    if(name==='react/jsx-runtime')return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'fragment'};
    if(name.endsWith('.css'))return new Proxy({},{get:(_,key)=>String(key)});
    throw Error('Unexpected module '+name);
  }});
  const render=()=>{cursor=0;tree=module.exports.default();};
  const settle=async()=>{for(let i=0;i<20;i++){render();while(effects.length)effects.shift()();await Promise.resolve()}render();};
  function flatten(node=tree){if(Array.isArray(node))return node.flatMap(flatten);if(!node||typeof node!=='object')return[];return[node,...flatten(node.props?.children ?? null)]}
  function text(node=tree){if(Array.isArray(node))return node.map(text).join('');if(node===null||node===undefined||typeof node==='boolean')return'';if(typeof node!=='object')return String(node);return text(node.props?.children ?? null)}
  const button=label=>flatten().find(n=>n.type==='button'&&(text(n)===label||n.props['aria-label']===label));
  const click=async label=>{assert(button(label),'missing '+label);button(label).props.onClick();await settle()};
  const enable=async()=>{await settle();await click('Open ReyGuild assistant');await click('Enable for this session')};
  const send=async value=>{flatten().find(n=>n.type==='textarea').props.onChange({target:{value}});await settle();flatten().find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await settle()};
  const handsFree=async checked=>{flatten().find(n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked}});await settle()};
  return{settle,button,click,send,enable,flatten,text,voice,handsFree,async navigate(value){pathname=value;await settle()}};
}
const json=(body,status=200)=>Promise.resolve({ok:status<400,json:async()=>body});
const pending={reply:'Review the note.',pending:{token:'test-note-token',summary:'Sample Job\nInstalled the panel.',kind:'log_activity'}};
const normal={reply:'Panel upgrade',sources:[{label:'Sample Job',href:'/tm/tech/jobs/test'}]};
function api(options={}) {
  const calls={chat:[],confirm:[]};
  const fetch=async(url,init)=>{
    if(url==='/api/assistant/confirm'){calls.confirm.push(JSON.parse(init.body));return options.confirm?options.confirm(init):json({ok:true,message:'Activity note saved.'})}
    if(!init?.method)return options.get?options.get(init):json({available:true,configured:true});
    calls.chat.push(JSON.parse(init.body));return options.chat?options.chat(init):json(normal);
  };
  return{calls,fetch};
}

test('assistant consent gates POST and actual component renders grounded reply',async()=>{
  const a=api(),h=fixture(a.fetch);await h.settle();await h.click('Open ReyGuild assistant');assert.equal(a.calls.chat.length,0);
  assert.match(h.text(),/sent to OpenAI/);await h.click('Enable for this session');await h.send('What is the description?');
  assert.equal(a.calls.chat.length,1);assert.equal(a.calls.chat[0].consent,true);assert.match(h.text(),/Panel upgrade/);assert.match(h.text(),/Sample Job/);
});
test('rapid repeated submissions and confirmations run once',async()=>{
  let resolve;const a=api({chat:()=>new Promise(r=>resolve=r)}),h=fixture(a.fetch);await h.enable();await h.send('Log note: Installed the panel.');
  const form=h.flatten().find(n=>n.type==='form');form.props.onSubmit({preventDefault(){}});form.props.onSubmit({preventDefault(){}});assert.equal(a.calls.chat.length,1);
  resolve(await json(pending));await h.settle();assert.equal(a.calls.confirm.length,0);
  const confirm=h.button('Confirm and save').props.onClick;confirm();confirm();await h.settle();assert.equal(a.calls.confirm.length,1);assert.match(h.text(),/Activity note saved/);
});
test('failed confirmation retains the exact token for a safe retry',async()=>{
  let fail=true;const a=api({chat:()=>json(pending),confirm:()=>fail?json({error:'Uncertain save'},500):json({ok:true,message:'Activity note saved.'})}),h=fixture(a.fetch);
  await h.enable();await h.send('Log note: Installed the panel.');await h.click('Confirm and save');assert.match(h.text(),/Uncertain save/);assert(h.button('Confirm and save'));
  fail=false;await h.click('Confirm and save');assert.deepEqual(a.calls.confirm.map(c=>c.token),['test-note-token','test-note-token']);
});
test('cancel is read-only and permits a new question',async()=>{
  const a=api({chat:()=>json(pending)}),h=fixture(a.fetch);await h.enable();await h.send('Log note');await h.click('Cancel');assert.equal(a.calls.confirm.length,0);assert(!h.button('Confirm and save'));await h.send('Another question');assert.equal(a.calls.chat.length,2);
});
test('late availability response cannot reopen assistant on login',async()=>{
  let resolve;const a=api({get:()=>new Promise(r=>resolve=r)}),h=fixture(a.fetch);await h.settle();await h.navigate('/login');resolve(await json({available:true,configured:true}));await h.settle();assert.equal(h.text(),'');
});
test('closing discards a stale chat reply',async()=>{
  let resolve;const a=api({chat:()=>new Promise(r=>resolve=r)}),h=fixture(a.fetch);await h.enable();await h.send('Description?');await h.click('Close assistant');resolve(await json(normal));await h.settle();await h.click('Open ReyGuild assistant');assert.doesNotMatch(h.text(),/Panel upgrade/);
});
test('successful save while closed is visible after reopening the same page',async()=>{
  let resolve;const a=api({chat:()=>json(pending),confirm:()=>new Promise(r=>resolve=r)}),h=fixture(a.fetch);await h.enable();await h.send('Log note');h.button('Confirm and save').props.onClick();await h.settle();await h.click('Close assistant');resolve(await json({ok:true,message:'Activity note saved.'}));await h.settle();await h.click('Open ReyGuild assistant');assert.match(h.text(),/Activity note saved/);assert(!h.button('Confirm and save'));
});
test('save response does not leak old conversation across navigation',async()=>{
  let resolve;const a=api({chat:()=>json(pending),confirm:()=>new Promise(r=>resolve=r)}),h=fixture(a.fetch);await h.enable();await h.send('Log note');h.button('Confirm and save').props.onClick();await h.settle();await h.navigate('/tm/admin');resolve(await json({ok:true,message:'Private old conversation'}));await h.settle();await h.click('Open ReyGuild assistant');assert.doesNotMatch(h.text(),/Private old conversation/);
});
test('voice confirm requires completed readback and old speech cannot restart after close',async()=>{
  const a=api({chat:()=>json(pending)}),h=fixture(a.fetch);await h.enable();await h.send('Log note');await h.click('Speak');h.voice.last.onresult({results:[[{transcript:'confirm'}]]});await h.settle();assert.equal(a.calls.confirm.length,0);
  await h.handsFree(true);const stale=h.voice.utterance;await h.click('Close assistant');await h.click('Open ReyGuild assistant');const count=h.voice.starts;stale.onend();assert.equal(h.voice.starts,count);
  await h.handsFree(false);await h.handsFree(true);h.voice.utterance.onend();await h.settle();h.voice.last.onresult({results:[[{transcript:'confirm'}]]});await h.settle();assert.equal(a.calls.confirm.length,1);
});
test('hands-free speech submits only while the panel is active',async()=>{
  const a=api(),h=fixture(a.fetch);await h.enable();await h.handsFree(true);await h.click('Speak');const mic=h.voice.last;mic.onresult({results:[[{transcript:'What is the job description?'}]]});await h.settle();assert.equal(a.calls.chat.length,1);await h.click('Close assistant');mic.onresult({results:[[{transcript:'Send another question'}]]});await h.settle();assert.equal(a.calls.chat.length,1);
});
