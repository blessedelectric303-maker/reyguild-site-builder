import { prisma } from "@/lib/prisma";

// Mounted only after the existing job page has authorized this actor/job.
export default async function ActivityNotes({jobId,orgId}:{jobId:string;orgId:string}) {
  const notes=await prisma.jobStatusUpdate.findMany({
    where:{jobId,job:{orgId},updateType:"assistant_note"},
    select:{id:true,notes:true,createdAt:true,user:{select:{name:true}}},
    orderBy:{createdAt:"desc"},take:30,
  });
  if(!notes.length)return null;
  return <section id="activity" className="rounded-xl border border-slate-300 bg-white p-4 text-slate-900">
    <h2 className="font-semibold">Activity notes</h2>
    <p className="mb-3 text-xs text-slate-500">User-reported notes. Hours, materials and job status are recorded separately.</p>
    <ul className="space-y-3">{notes.map(note=><li key={note.id}>
      <p className="whitespace-pre-wrap break-words text-sm">{note.notes}</p>
      <p className="mt-1 text-xs text-slate-500">Reported by {note.user.name} · {note.createdAt.toISOString().replace("T"," ").replace(/\.\d+Z$/," UTC")}</p>
    </li>)}</ul>
  </section>;
}
