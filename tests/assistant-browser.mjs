// Real Chromium + the actual React component. API/voice are isolated fakes;
// this is UI coverage, not a live database, microphone or OpenAI test.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');

const dir=path.resolve('.next/assistant-ui-test');await fs.mkdir(dir,{recursive:true});
await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import Assistant from './components/FieldAssistant';createRoot(document.getElementById('root')).render(<Assistant/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,outfile:path.join(dir,'fixture.js'),jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'mock-pathname',setup(b){b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`import{useSyncExternalStore}from'react';export function usePathname(){return useSyncExternalStore(cb=>{window.addEventListener('popstate',cb);return()=>window.removeEventListener('popstate',cb)},()=>location.pathname,()=>location.pathname)}`,resolveDir:process.cwd(),loader:'js'}));}}]});
const html='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><style>body{background:#e9edf3;font:16px Arial;margin:24px}*{box-sizing:border-box}button{cursor:pointer}</style><p>Offline assistant component test fixture · synthetic data</p><div id="root"></div><script src="/fixture.js"></script>';
const server=createServer(async(req,res)=>{const file=req.url==='/fixture.js'?'fixture.js':req.url==='/fixture.css'?'fixture.css':null;res.setHeader('Content-Type',file?.endsWith('.js')?'text/javascript':file?'text/css':'text/html');res.end(file?await fs.readFile(path.join(dir,file)):html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1365,height:900}});
await context.addInitScript(()=>{
  window.__micStarts=0;
  window.SpeechRecognition=class {start(){window.__micStarts++;window.__mic=this}abort(){this.onend?.()}};
  window.SpeechSynthesisUtterance=class {constructor(text){this.text=text}};
  Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},speak(u){window.__speech=u}}});
});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
let posts=0,saves=0,failSave=false,delayChat=0;const tokens=[];
await page.route('**/api/assistant',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{available:true,configured:true}});
  posts++;const body=route.request().postDataJSON();assert.equal(body.consent,true);
  if(delayChat)await new Promise(r=>setTimeout(r,delayChat));
  const last=body.messages.at(-1).content;
  const response=/note/i.test(last)?{reply:'Review this activity note.',pending:{token:'same-test-token',summary:'Sample Job · 100 Main St\n\nInstalled the panel.',kind:'log_activity'}}:{reply:'The recorded description is: Panel upgrade.',sources:[{label:'Sample Job',href:'/tm/tech/jobs/test'}]};
  await route.fulfill({json:response}).catch(()=>{});
});
await page.route('**/api/assistant/confirm',async route=>{
  saves++;tokens.push(route.request().postDataJSON().token);
  await new Promise(r=>setTimeout(r,40));
  await route.fulfill({status:failSave?500:200,json:failSave?{error:'Save status uncertain. Retry the same confirmation.'}:{ok:true,message:'Activity note saved.',source:{label:'View job activity',href:'/tm/tech/jobs/test#activity'}}});
});
const waitText=async text=>page.getByText(text,{exact:true}).waitFor();
const open=async()=>{await page.getByRole('button',{name:'Open ReyGuild assistant'}).click();};
const send=async text=>{await page.getByLabel('Question or exact note').fill(text);await page.getByRole('button',{name:'Send',exact:true}).click();};
try {
  await page.goto(base+'/login');await page.waitForTimeout(100);assert.equal(await page.getByRole('button',{name:'Open ReyGuild assistant'}).count(),0);
  console.log('PASS hidden on login');
  await page.goto(base+'/tm/tech');await open();assert.equal(posts,0);await page.getByRole('button',{name:'Enable for this session'}).click();
  await page.getByLabel('Question or exact note').fill('What is the job description?');
  await page.getByRole('button',{name:'Send',exact:true}).evaluate(b=>{b.click();b.click()});
  await waitText('The recorded description is: Panel upgrade.');assert.equal(posts,1);assert.equal(saves,0);
  console.log('PASS consent, actual React rendering, source links and double-submit lock');
  await send('Log note: Installed the panel.');await waitText('Review activity note');assert.equal(saves,0);
  await page.getByRole('button',{name:'Confirm and save'}).evaluate(b=>{b.click();b.click()});await waitText('Activity note saved.');assert.equal(saves,1);
  console.log('PASS explicit review and duplicate confirmation lock');
  await send('Log another note: Installed the panel.');await waitText('Review activity note');failSave=true;
  await page.getByRole('button',{name:'Confirm and save'}).click();await waitText('Save status uncertain. Retry the same confirmation.');
  failSave=false;await page.getByRole('button',{name:'Confirm and save'}).click();await page.getByRole('button',{name:'Confirm and save'}).waitFor({state:'detached'});assert.equal(tokens.at(-1),tokens.at(-2));
  console.log('PASS uncertain save retries retain identical token');
  await send('Log note: Installed the panel.');await waitText('Review activity note');
  await page.getByRole('button',{name:'Speak',exact:true}).click();await page.evaluate(()=>window.__mic.onresult({results:[[{transcript:'confirm'}]]}));assert.equal(saves,3);
  await page.getByLabel('Hands-free: send speech and read replies aloud').check();
  await page.evaluate(()=>{window.__oldSpeech=window.__speech;});await page.getByRole('button',{name:'Close assistant'}).click();await open();
  const starts=await page.evaluate(()=>window.__micStarts);await page.evaluate(()=>window.__oldSpeech.onend());assert.equal(await page.evaluate(()=>window.__micStarts),starts);
  console.log('PASS voice cannot confirm before readback; canceled speech cannot restart microphone');
  await page.getByLabel('Hands-free: send speech and read replies aloud').uncheck();await page.getByLabel('Hands-free: send speech and read replies aloud').check();
  await page.evaluate(()=>window.__speech.onend());await page.evaluate(()=>window.__mic.onresult({results:[[{transcript:'confirm'}]]}));await page.getByRole('button',{name:'Confirm and save'}).waitFor({state:'detached'});assert.equal(saves,4);
  console.log('PASS spoken confirm after completed exact readback');
  await page.getByLabel('Hands-free: send speech and read replies aloud').uncheck();
  await page.screenshot({path:path.join(dir,'desktop.png')});await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(dir,'mobile.png')});
  const box=await page.getByRole('dialog').boundingBox();assert(box&&box.x>=0&&box.x+box.width<=391&&box.y>=0);
  console.log('PASS desktop/mobile viewport layout');
  delayChat=150;await send('What is the job description?');await page.getByRole('button',{name:'Close assistant'}).click();await page.waitForTimeout(220);await open();assert.equal(await page.getByText('The recorded description is: Panel upgrade.',{exact:true}).count(),1);
  await page.evaluate(()=>{history.pushState({},'', '/login');dispatchEvent(new PopStateEvent('popstate'));});await page.waitForTimeout(80);assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.getByRole('button',{name:'Open ReyGuild assistant'}).count(),0);
  console.log('PASS close/navigation discard stale responses and hide assistant');
  assert.deepEqual(errors,[]);console.log('PASS no browser JavaScript errors');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
