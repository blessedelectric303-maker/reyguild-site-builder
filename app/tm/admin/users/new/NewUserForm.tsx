"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewUserForm({
  canCreateOwner,
  canCreateAdmin,
}: {
  canCreateOwner: boolean;
  canCreateAdmin: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("technician");
  const [password, setPassword] = useState("");
  const [hourlyCost, setHourlyCost] = useState("");
  const [canPurchase, setCanPurchase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    const parsedCost = hourlyCost.trim() === "" ? null : Number(hourlyCost);
    if (parsedCost !== null && (isNaN(parsedCost) || parsedCost < 0)) {
      setError("Hourly cost must be a valid positive number.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          role,
          password,
          hourlyCost: parsedCost,
          canLogMaterialPurchases: canPurchase,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create user");
        setLoading(false);
        return;
      }

      router.push("/tm/admin/users");
      router.refresh();
    } catch (err) {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <Field label="Full Name" required>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </Field>

      <Field label="Email" required>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          autoComplete="off"
        />
      </Field>

      <Field label="Phone">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (303) 555-1234"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </Field>

      <Field label="Role" required>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="technician">Technician / Electrician</option>
          <option value="estimator">Estimator / Sales</option>
          {canCreateAdmin && <option value="admin">Admin / Operations</option>}
          {canCreateOwner && <option value="owner">Owner / CEO</option>}
        </select>
        <p className="text-xs text-slate-500 mt-1">
          {role === "technician" && "Field crew. Clocks in/out, uploads photos, requests materials. No price visibility."}
          {role === "estimator" && "Sales. Creates jobs, builds material lists, sees markup percentages."}
          {role === "admin" && "Operations. Schedules jobs, approves requests, sees costs and profit."}
          {role === "owner" && "Full access. Profit oversight, audit log, can lock admin margin views."}
        </p>
      </Field>

      <Field label="Hourly Cost (what the company pays this person per hour)">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={hourlyCost}
            onChange={(e) => setHourlyCost(e.target.value)}
            placeholder="0.00"
            className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Used to calculate labor cost on jobs. Includes wage + overhead. Leave blank if not applicable.
        </p>
      </Field>

      <div className="flex items-start gap-2 pt-2">
        <input
          id="canPurchase"
          type="checkbox"
          checked={canPurchase}
          onChange={(e) => setCanPurchase(e.target.checked)}
          className="rounded mt-0.5"
        />
        <label htmlFor="canPurchase" className="text-sm text-slate-700">
          Can log material purchases
          <p className="text-xs text-slate-500 mt-0.5">
            When enabled, this person can record material purchases with prices and receipts (deducts from job profit). Most techs should NOT have this enabled.
          </p>
        </label>
      </div>

      <Field label="Initial Password" required>
        <input
          type="text"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm"
          placeholder="At least 8 characters"
          autoComplete="off"
        />
        <p className="text-xs text-slate-500 mt-1">
          Share this password with the employee privately. They can change it later.
        </p>
      </Field>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Employee"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/tm/admin/users")}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}