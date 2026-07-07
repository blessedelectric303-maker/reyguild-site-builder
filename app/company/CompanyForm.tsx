"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Profile = {
  name: string;
  trade: string;
  phone: string;
  area: string;
  email: string;
  website: string;
  logo: string;
};

function resizeImage(file: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const r = Math.min(max / width, max / height, 1);
        width = Math.round(width * r);
        height = Math.round(height * r);
        const cv = document.createElement("canvas");
        cv.width = width;
        cv.height = height;
        const g = cv.getContext("2d");
        if (g) g.drawImage(img, 0, 0, width, height);
        resolve(cv.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CompanyForm({
  companyId,
  initial,
}: {
  companyId: string;
  initial: Profile;
}) {
  const supabase = createClient();
  const [f, setF] = useState<Profile>(initial);
  const [status, setStatus] = useState("");

  function set(k: keyof Profile, v: string) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function save() {
    setStatus("Saving…");
    const { error } = await supabase
      .schema("suite")
      .from("companies")
      .update({
        name: f.name,
        trade: f.trade,
        phone: f.phone,
        area: f.area,
        email: f.email,
        website: f.website,
      })
      .eq("id", companyId);
    setStatus(error ? "Couldn't save: " + error.message : "Saved ✓");
    setTimeout(() => setStatus(""), 1800);
  }

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setStatus("Uploading logo…");
    const dataUrl = await resizeImage(file, 420);
    setF((prev) => ({ ...prev, logo: dataUrl }));
    await supabase
      .schema("suite")
      .from("companies")
      .update({ logo: dataUrl })
      .eq("id", companyId);
    setStatus("Logo saved ✓");
    setTimeout(() => setStatus(""), 1800);
  }

  async function removeLogo() {
    setF((prev) => ({ ...prev, logo: "" }));
    await supabase
      .schema("suite")
      .from("companies")
      .update({ logo: null })
      .eq("id", companyId);
  }

  const field = "w-full rounded-md bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100 text-sm";
  const label = "block text-xs uppercase tracking-wide text-slate-400 mt-4 mb-1";

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-2xl mx-auto">
        <a href="/" className="text-sm text-slate-400 hover:text-white">
          ← Back to command center
        </a>
        <h1 className="mt-4 text-2xl font-bold text-white">Company profile</h1>
        <p className="text-slate-400 text-sm mt-1">
          Enter it once here — your name, logo, and details flow to every app you
          use. No more typing it in five places.
        </p>

        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/50 p-5">
          <span className={label}>Company logo</span>
          <div className="flex items-center gap-4">
            {f.logo ? (
              <img
                src={f.logo}
                alt="Logo"
                className="h-16 w-auto max-w-[140px] object-contain rounded bg-white p-1"
              />
            ) : (
              <span className="text-slate-500 text-sm">No logo yet</span>
            )}
            <label className="cursor-pointer rounded-md px-4 py-2 text-sm font-semibold text-slate-900" style={{ background: "#e0a82e" }}>
              {f.logo ? "Change logo" : "Upload logo"}
              <input type="file" accept="image/*" className="hidden" onChange={onLogo} />
            </label>
            {f.logo && (
              <button onClick={removeLogo} className="text-xs text-slate-400 hover:text-white">
                Remove
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            This shows on your command center and on every app. PNG works best.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/50 p-5">
          <span className={label} style={{ marginTop: 0 }}>Company name</span>
          <input className={field} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Blessed Electric" />
          <span className={label}>Trade</span>
          <input className={field} value={f.trade} onChange={(e) => set("trade", e.target.value)} placeholder="electrician, plumber, HVAC…" />
          <span className={label}>Phone</span>
          <input className={field} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(720) 555-0100" />
          <span className={label}>Service area</span>
          <input className={field} value={f.area} onChange={(e) => set("area", e.target.value)} placeholder="Denver & the metro area" />
          <span className={label}>Email</span>
          <input className={field} value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="you@company.com" />
          <span className={label}>Website</span>
          <input className={field} value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="yourcompany.com" />

          <div className="mt-5 flex items-center gap-3">
            <button onClick={save} className="rounded-md px-5 py-2 text-sm font-semibold text-slate-900" style={{ background: "#e0a82e" }}>
              Save
            </button>
            {status && <span className="text-xs text-slate-300">{status}</span>}
          </div>
        </div>
      </div>
    </main>
  );
}
