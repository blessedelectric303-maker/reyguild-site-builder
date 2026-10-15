import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assistantActor, assistantConfigured } from "@/lib/assistant/auth";
import { AssistantError, assertSameOrigin, verifyNoteToken } from "@/lib/assistant/core";
import { createRecords } from "@/lib/assistant/records";

export const dynamic="force-dynamic";
export const runtime="nodejs";
const schema=z.object({token:z.string().min(1).max(8000),confirmed:z.literal(true)}).strict();
export async function POST(req:Request) {
  try {
    assertSameOrigin(req);
    const actor=await assistantActor();
    if(!assistantConfigured()) throw new AssistantError("The assistant is paused. No activity was saved.",503);
    const raw=await req.text();if(raw.length>10000) throw new AssistantError("Invalid confirmation.");
    let body:unknown;try{body=JSON.parse(raw);}catch{throw new AssistantError("Review and confirm the exact note first.");}
    const parsed=schema.safeParse(body);if(!parsed.success) throw new AssistantError("Review and confirm the exact note first.");
    const note=verifyNoteToken(parsed.data.token,actor,process.env.JWT_SECRET!);
    return NextResponse.json(await createRecords(prisma,actor).saveNote(note),{headers:{"Cache-Control":"no-store"}});
  } catch(e) {return NextResponse.json({error:e instanceof AssistantError?e.message:"Could not confirm the save. Retry the same confirmation to avoid a duplicate."},{status:e instanceof AssistantError?e.status:500,headers:{"Cache-Control":"no-store"}});}
}
