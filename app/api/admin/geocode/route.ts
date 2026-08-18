import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, ADMIN_ROLES, ROLES } from "@/lib/auth";
import { geocodeAddress } from "@/lib/google-maps";

const schema = z.object({
  address: z.string().min(3).max(500),
});

export async function POST(req: Request) {
  try {
    await requireRole([...ADMIN_ROLES, ROLES.ESTIMATOR]);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    const result = await geocodeAddress(parsed.data.address);
    if (!result) {
      return NextResponse.json(
        { error: "Could not find that address. Check spelling or try another." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    console.error("Geocode error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}