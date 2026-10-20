import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { assistantActor, assistantConfigured } from "@/lib/assistant/auth";
import { AssistantError, assertSameOrigin, canReadJobDetail, chatSchema } from "@/lib/assistant/core";
import { createRecords } from "@/lib/assistant/records";
import { answerQuestion, openAIProvider } from "@/lib/assistant/service";

export const dynamic="force-dynamic";
export const runtime="nodejs";
export const maxDuration=120;
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function GET() {
  try {
    const actor=await assistantActor();
    return json({available:true,configured:assistantConfigured(),actor:{name:actor.name},message:assistantConfigured()?undefined:"AI is not enabled yet. Your existing app is unchanged.",capabilities:["Find authorized jobs",...(canReadJobDetail(actor)?["Read job descriptions and permitted prices"]:[]),"Read your hours",...(canReadJobDetail(actor)&&!actor.locked?["Save a reviewed activity note"]:[]),"Open existing workflows"]});
  } catch(e) {return json({available:false,configured:false,message:e instanceof AssistantError?e.message:"Assistant access is temporarily unavailable."},e instanceof AssistantError?e.status:503);}
}
export async function POST(req:Request) {
  try {
    assertSameOrigin(req);
    const actor=await assistantActor();
    if(!assistantConfigured()) throw new AssistantError("AI is not enabled yet. Ask the owner to finish the server setup.",503);
    const limit=rateLimit(`assistant:${actor.orgId}:${actor.id}`,12,60_000);
    if(!limit.ok) return json({error:"Please wait a minute before asking again."},429);
    const raw=await req.text();if(raw.length>24000) throw new AssistantError("Please shorten the conversation.",413);
    let body:unknown;try{body=JSON.parse(raw);}catch{throw new AssistantError("Enter a valid question and try again.");}
    const parsed=chatSchema.safeParse(body);
    if(!parsed.success) throw new AssistantError("Enter a short question and enable the assistant first.");
    try {new Intl.DateTimeFormat("en-US",{timeZone:parsed.data.timeZone});} catch {throw new AssistantError("Your time zone could not be read. Please reload.");}
    const result=await answerQuestion({actor,records:createRecords(prisma,actor),...parsed.data,secret:process.env.JWT_SECRET!,provider:openAIProvider(process.env.OPENAI_API_KEY!,process.env.OPENAI_MODEL!,fetch,req.signal)});
    return json(result);
  } catch(e) {return json({error:e instanceof AssistantError?e.message:"The assistant couldn't complete that request. Please try again."},e instanceof AssistantError?e.status:500);}
}
