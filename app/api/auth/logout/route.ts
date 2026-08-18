import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  try {
    const store = await cookies();
    const token = store.get("blessed_track_session")?.value;

    if (token) {
      await prisma.session.deleteMany({ where: { token } }).catch(() => {});
    }

    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}