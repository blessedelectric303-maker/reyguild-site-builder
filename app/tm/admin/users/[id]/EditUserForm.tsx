"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UserData = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  marginViewLocked: boolean;
  hourlyCost: number | null;
  hourlyWage: number | null;
  canLogMaterialPurchases: boolean;
};

export default function EditUserForm({
  user,
  canEditRole,
  canDeactivate,
  canResetPassword,
  canLockMargin,
  canCreateOwner,
  canCreateAdmin,
  canEditCost,
  canEditEmail,
}: {
  user: UserData;
  canEditRole: boolean;
  canDeactivate: boolean;
  canResetPassword: boolean;
  canLockMargin: boolean;
  canCreateOwner: boolean;
  canCreateAdmin: boolean;
  canEditCost: boolean;
  canEditEmail: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || "");
  const [role, setRole] = useState(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [marginLocked, setMarginLocked] = useState(user.marginViewLocked);
  const [hourlyCost, setHourlyCost] = useState(
    user.hourlyCost !== null ? String(user.hourlyCost) : ""
  );
  const [hourlyWage, setHourlyWage] = useState(
    user.hourlyWage !== null ? String(user.hourlyWage) : ""
  );
  const [canPurchase, setCanPurchase] = useState(user.canLogMaterialPurchases);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function saveChanges() {
    setError(null);
    setMessage(null);
    setLoading(true);

    // Email validation if editable and changed
    const trimmedEmail = email.trim().toLowerCase();
    const emailChanged = canEditEmail && trimmedEmail !== user.email;
    if (canEditEmail) {
      if (!trimmedEmail) {
        setError("Email cannot be empty.");
        setLoading(false);
        return;
      }
      // Basic shape check; server does the real validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setError("Please enter a valid email address.");
        setLoading(false);
        return;
      }
    }

    const parsedCost = hourlyCost.trim() === "" ? null : Number(hourlyCost);
    if (parsedCost !== null && (isNaN(parsedCost) || parsedCost < 0)) {
      setError("Hourly cost must be a valid positive number.");
      setLoading(false);
      return;
    }
    if (parsedCost !== null && parsedCost > 999.99) {
      setError("Hourly cost cannot exceed $999.99.");
      setLoading(false);
      return;
    }

    const parsedWage = hourlyWage.trim() === "" ? null : Number(hourlyWage);
    if (parsedWage !== null && (isNaN(parsedWage) || parsedWage < 0)) {
      setError("Hourly wage must be a valid positive number.");
      setLoading(false);
      return;
    }
    if (parsedWage !== null && parsedWage > 999.99) {
      setError("Hourly wage cannot exceed $999.99.");
      setLoading(false);
      return;
    }

    if (parsedCost !== null && parsedWage !== null && parsedWage > parsedCost) {
      setError(
        "Wage ($" +
          parsedWage.toFixed(2) +
          ") is higher than the cost rate charged to jobs ($" +
          parsedCost.toFixed(2) +
          "). That means you would lose money on every hour. Double-check the numbers."
      );
      setLoading(false);
      return;
    }

    // Extra confirmation for email change — destructive
    if (emailChanged) {
      const confirmed = window.confirm(
        "Change login email from\n\n" +
          user.email +
          "\n\nto\n\n" +
          trimmedEmail +
          "\n\nThis person will be signed out of all devices and will need to log in with the new email. Their current password still works. Proceed?"
      );
      if (!confirmed) {
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/admin/users/" + user.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: canEditEmail ? trimmedEmail : undefined,
          phone: phone || null,
          role: canEditRole ? role : undefined,
          isActive: canDeactivate ? isActive : undefined,
          marginViewLocked: canLockMargin ? marginLocked : undefined,
          hourlyCost: canEditCost ? parsedCost : undefined,
          hourlyWage: canEditCost ? parsedWage : undefined,
          canLogMaterialPurchases: canEditCost ? canPurchase : undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save");
        setLoading(false);
        return;
      }

      setMessage(
        data.emailChanged
          ? "Changes saved. Email updated — they were signed out everywhere."
          : "Changes saved"
      );
      setNewPassword("");
      setLoading(false);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <Field label="Full Name">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </Field>

      <Field label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!canEditEmail}
          autoComplete="off"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-500"
        />
        {canEditEmail ? (
          <p className="text-xs text-slate-500 mt-1">
            This is the login identifier. Changing it signs this person out of all
            devices. Their password stays the same. Make sure the new email is one
            they can actually receive mail at.
          </p>
        ) : (
          <p className="text-xs text-slate-500 mt-1">
            Email is the login identifier. Only Owners can change Owner emails.
          </p>
        )}
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

      <Field label="Role">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={!canEditRole}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-500"
        >
          <option value="technician">Technician / Electrician</option>
          <option value="estimator">Estimator / Sales</option>
          {canCreateAdmin && <option value="admin">Admin / Operations</option>}
          {canCreateOwner && <option value="owner">Owner / CEO</option>}
        </select>
        {!canEditRole && (
          <p className="text-xs text-slate-500 mt-1">
            Only Owners can change roles, and not for their own account.
          </p>
        )}
      </Field>

      {canEditCost && (
        <>
          <Field label="Hourly Cost — what you charge jobs (loaded rate)">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                $
              </span>
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
              The fully-loaded rate that gets deducted from job sale price to
              calculate profit. Includes wages + overhead + insurance + truck +
              tools, etc.
            </p>
          </Field>

          <Field label="Hourly Wage — what this person actually gets paid">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={hourlyWage}
                onChange={(e) => setHourlyWage(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Used on the Timesheets page to calculate payroll. The difference
              between Cost and Wage is the company&apos;s overhead per hour.
              Leave blank to treat wage = cost.
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
                When enabled, this person can record material purchases with
                prices and receipts (deducts from job profit). Most techs
                should NOT have this enabled.
              </p>
            </label>
          </div>
        </>
      )}

      {canDeactivate && (
        <div className="flex items-center gap-2 pt-2">
          <input
            id="isActive"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="isActive" className="text-sm text-slate-700">
            Active (can log in)
          </label>
        </div>
      )}

      {canLockMargin && (
        <div className="flex items-start gap-2 pt-2">
          <input
            id="marginLocked"
            type="checkbox"
            checked={marginLocked}
            onChange={(e) => setMarginLocked(e.target.checked)}
            className="rounded mt-0.5"
          />
          <label htmlFor="marginLocked" className="text-sm text-slate-700">
            Lock margin view
            <p className="text-xs text-slate-500 mt-0.5">
              Hide profit margins and cost-alert banners from this admin. They
              will still see job costs, but not profit %.
            </p>
          </label>
        </div>
      )}

      {canResetPassword && (
        <Field label="Reset Password (optional)">
          <input
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm"
            autoComplete="off"
          />
          <p className="text-xs text-slate-500 mt-1">
            If you set a new password, share it with the employee privately.
          </p>
        </Field>
      )}

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {message && (
        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {message}
        </div>
      )}

      <div className="pt-2">
        <button
          onClick={saveChanges}
          disabled={loading}
          className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
