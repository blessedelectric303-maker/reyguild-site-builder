import type { PrismaClient } from "@prisma/client";
import { Actor, AssistantError, Note, assertActor, assertJobDetailAllowed, jobScope, jobSource, office } from "./core";

export function createRecords(db: PrismaClient, actor: Actor) {
  assertActor(actor);
  return {
    async searchJobs(query: string) {
      const jobs = await db.job.findMany({where:{...jobScope(actor),...(query ? {OR:[{customerName:{contains:query,mode:"insensitive" as const}},{jobAddress:{contains:query,mode:"insensitive" as const}},{id:query}]} : {status:{notIn:["completed","cancelled","archived"]}})},
        select:{id:true,customerName:true,jobAddress:true,status:true,scheduledStart:true},orderBy:[{scheduledStart:"desc"},{id:"asc"}],take:21});
      return {jobs:jobs.slice(0,20),truncated:jobs.length>20,limit:20};
    },
    async getJob(id: string) {
      assertJobDetailAllowed(actor);
      const job = await db.job.findFirst({where:jobScope(actor,id),select:{id:true,customerName:true,jobAddress:true,status:true,jobDescription:true,scheduledStart:true,scheduledEnd:true,...(office(actor)?{salePrice:true}:{}),statusUpdates:{where:{updateType:"assistant_note"},select:{id:true,notes:true,createdAt:true,user:{select:{name:true}}},orderBy:{createdAt:"desc"},take:20}}});
      if(!job) throw new AssistantError("That job isn't available to your account.",404);
      return {...job,source:jobSource(actor,job.id,job.customerName)};
    },
    async myHours(from: string, to: string) {
      const start = new Date(from), end = new Date(to);
      if(!Number.isFinite(+start)||!Number.isFinite(+end)||+end<=+start||+end-+start>32*86400_000)
        throw new AssistantError("Choose a valid date range up to 31 days, with a time zone.");
      const entries = await db.timeEntry.findMany({where:{userId:actor.id,job:{orgId:actor.orgId},clockInAt:{gte:start,lt:end}},select:{id:true,clockInAt:true,clockOutAt:true,totalMinutes:true,job:{select:{id:true,customerName:true}}},orderBy:{clockInAt:"desc"},take:201});
      return {entries:entries.slice(0,200),truncated:entries.length>200,closedMinutes:entries.slice(0,200).reduce((sum,e)=>sum+(e.clockOutAt?e.totalMinutes||0:0),0),note:"Open entries are not final paid hours. Date range filters clock-in time."};
    },
    async saveNote(note: Note) {
      assertJobDetailAllowed(actor);
      if(note.actorId!==actor.id||note.orgId!==actor.orgId)
        throw new AssistantError("The request could not be verified for your account.",403);
      if(actor.locked) throw new AssistantError("Your company is read-only.",403);
      // The note and audit share deterministic IDs and one transaction. A lost
      // response or simultaneous retry cannot create a second activity entry.
      const id = `assistant_note_${note.id}`, auditId = `assistant_audit_${note.id}`;
      const result = () => ({ok:true as const,message:"Activity note saved. Time, materials, prices and job status were not changed.",source:jobSource(actor,note.jobId,"View job activity")});
      const run = async () => db.$transaction(async tx => {
        const job = await tx.job.findFirst({where:jobScope(actor,note.jobId),select:{id:true,status:true}});
        if(!job) throw new AssistantError("That job is no longer available to your account.",404);
        const prior = await tx.auditLog.findUnique({where:{id:auditId},select:{actorUserId:true,orgId:true,targetId:true}});
        if(prior) {
          if(prior.actorUserId!==actor.id||prior.orgId!==actor.orgId||prior.targetId!==note.jobId) throw new AssistantError("The request could not be verified.",409);
          return result();
        }
        if(["completed","cancelled","archived","awaiting_invoice"].includes(job.status)) throw new AssistantError("This job is closed or awaiting invoice. Ask the office before adding work.",409);
        await tx.jobStatusUpdate.create({data:{id,jobId:job.id,userId:actor.id,updateType:"assistant_note",notes:note.text}});
        await tx.auditLog.create({data:{id:auditId,orgId:actor.orgId,actorUserId:actor.id,actorRole:actor.role,actionType:"assistant_activity_logged",targetTable:"Job",targetId:job.id,fieldChanged:"activity_note",newValue:JSON.stringify({activityId:id,text:note.text}),reason:"Exact user-reported note, explicitly confirmed in assistant"}});
        return result();
      },{isolationLevel:"Serializable"});
      for(let attempt=0;attempt<3;attempt++) {
        try {return await run();} catch(e) {
          if(!["P2002","P2034"].includes((e as {code?:string}).code||"")||attempt===2) throw e;
        }
      }
      throw new AssistantError("Could not save the activity. Please try again.",409);
    },
  };
}
