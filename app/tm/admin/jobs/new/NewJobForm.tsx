"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";

type Technician = { id: string; name: string };

declare global {
  interface Window {
    google: any;
  }
}

export type JobPrefill = {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  salePrice?: string;
  scopeOfWork?: string;
  proposalRef?: string;
};

type CostRow = { id: string; name: string; cost: string };
const newRow = (): CostRow => ({ id: Math.random().toString(36).slice(2), name: "", cost: "" });

export default function NewJobForm({
  technicians,
  prefill,
}: {
  technicians: Technician[];
  prefill?: JobPrefill;
}) {
  const router = useRouter();
  const pf = prefill || {};
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  const [customerName, setCustomerName] = useState(pf.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(pf.customerPhone || "");
  const [customerEmail, setCustomerEmail] = useState(pf.customerEmail || "");
  const [address, setAddress] = useState(pf.address || "");
  const [lat, setLat] = useState<number | null>(pf.lat ?? null);
  const [lng, setLng] = useState<number | null>(pf.lng ?? null);
  const [salePrice, setSalePrice] = useState(pf.salePrice || "");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [scopeOfWork, setScopeOfWork] = useState(pf.scopeOfWork || "");
  const [assignedTechIds, setAssignedTechIds] = useState<string[]>([]);
  const [mapsReady, setMapsReady] = useState(false);
  const [notes, setNotes] = useState("");
  const [noNotes, setNoNotes] = useState(false);
  const [materials, setMaterials] = useState<CostRow[]>([newRow()]);
  const [noMaterial, setNoMaterial] = useState(false);
  const [otherCosts, setOtherCosts] = useState<CostRow[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!mapsReady || !addressInputRef.current || autocompleteRef.current) return;
    if (!window.google?.maps?.places) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      addressInputRef.current,
      {
        types: ["address"],
        componentRestrictions: { country: "us" },
        fields: ["formatted_address", "geometry"],
      }
    );

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace();
      if (!place.geometry) {
        setError("Pick an address from the dropdown suggestions.");
        return;
      }
      setError(null);
      setAddress(place.formatted_address || "");
      setLat(place.geometry.location.lat());
      setLng(place.geometry.location.lng());
    });
  }, [mapsReady]);

  function toggleTech(id: string) {
    setAssignedTechIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!address || lat === null || lng === null) {
      setError("Please type an address and pick a suggestion from the dropdown.");
      return;
    }

    const parsedSale = salePrice.trim() === "" ? null : Number(salePrice);
    if (parsedSale !== null && (isNaN(parsedSale) || parsedSale < 0)) {
      setError("Sale price must be a valid positive number.");
      return;
    }

    // NOTHING GOES OUT HALF-FILLED. A tech arriving at a job with no scope,
    // no material list and no notes has to ring the office, which is the
    // thing this whole flow exists to stop. Either say what is needed or
    // tick the box saying none is - both are an answer, a blank is not.
    if (!scopeOfWork.trim()) {
      setError("Scope of work is required - what is being done on this job?");
      return;
    }
    const cleanMaterials = materials
      .filter((r) => r.name.trim() || r.cost.trim())
      .map((r) => ({ name: r.name.trim(), cost: Number(r.cost || 0) }));
    if (!noMaterial && cleanMaterials.length === 0) {
      setError("Add the material needed, or tick 'No material needed'.");
      return;
    }
    if (cleanMaterials.some((r) => !r.name || isNaN(r.cost) || r.cost < 0)) {
      setError("Every material line needs a name and a cost of zero or more.");
      return;
    }
    const cleanOther = otherCosts
      .filter((r) => r.name.trim() || r.cost.trim())
      .map((r) => ({ name: r.name.trim(), cost: Number(r.cost || 0) }));
    if (cleanOther.some((r) => !r.name || isNaN(r.cost) || r.cost < 0)) {
      setError("Every other-cost line needs a name and a cost of zero or more.");
      return;
    }
    if (!noNotes && !notes.trim()) {
      setError("Add a note for the tech, or tick 'Nothing extra to know'.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone: customerPhone || null,
          customerEmail: customerEmail || null,
          jobAddress: address,
          jobLat: lat,
          jobLng: lng,
          salePrice: parsedSale,
          scheduledStartAt: scheduledStart || null,
          scheduledEndAt: scheduledEnd || null,
          scopeOfWork: scopeOfWork || null,
          notes: noNotes ? "None" : notes,
          materials: noMaterial ? [] : cleanMaterials,
          otherCosts: cleanOther,
          assignedTechIds,
          // Sent so the job claims the proposal it came from. Without it the
          // proposal stays in the booking queue after the job is made.
          proposalRef: pf.proposalRef || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create job");
        setLoading(false);
        return;
      }

      router.push("/tm/admin/jobs/" + data.job.id);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <>
      {apiKey && (
        <Script
          src={"https://maps." + "googleapis.com/maps/api/js?key=" + apiKey + "&libraries=places"}
          strategy="afterInteractive"
          onLoad={() => setMapsReady(true)}
        />
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-slate-200 p-6 space-y-5"
      >
        <Section title="Customer">
          <Field label="Customer Name" required>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="input"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone">
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+1 (303) 555-1234"
                className="input"
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="input"
              />
            </Field>
          </div>
        </Section>

        <Section title="Job Site">
          <Field label="Address" required>
            <input
              ref={addressInputRef}
              type="text"
              required
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setLat(null);
                setLng(null);
              }}
              placeholder="Start typing an address..."
              className="input"
              autoComplete="off"
            />
            {lat !== null && lng !== null ? (
              <p className="text-xs text-emerald-700 mt-1">
                ✓ Location confirmed ({lat.toFixed(5)}, {lng.toFixed(5)})
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">
                Type the address and pick a suggestion. The geofence will be 1 mile from this location.
              </p>
            )}
          </Field>
        </Section>

        <Section title="Pricing">
          <Field label="Sale Price (what the customer is paying)">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0.00"
                className="input pl-7"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              The agreed-upon job total. Labor + materials will be deducted from this to track profit.
            </p>
          </Field>
        </Section>

        <Section title="Schedule">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Start">
              <input
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="End (optional)">
              <input
                type="datetime-local"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
                className="input"
              />
            </Field>
          </div>
        </Section>

        <Section title="Scope of Work">
          <textarea
            value={scopeOfWork}
            onChange={(e) => setScopeOfWork(e.target.value)}
            rows={4}
            className="input"
            placeholder="What work needs to be done? Customer notes, special instructions..."
          />
        </Section>

        <Section title="Material">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mb-2">
            <input type="checkbox" checked={noMaterial} onChange={(e) => setNoMaterial(e.target.checked)} className="rounded" />
            No material needed for this job
          </label>
          {!noMaterial && (
            <>
              {materials.map((row, i) => (
                <div key={row.id} className="flex gap-2 items-start">
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => setMaterials(materials.map((r) => r.id === row.id ? { ...r, name: e.target.value } : r))}
                    placeholder="What to pick up, and where"
                    className="input flex-1"
                  />
                  <div className="relative w-32 shrink-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number" step="0.01" min="0"
                      value={row.cost}
                      onChange={(e) => setMaterials(materials.map((r) => r.id === row.id ? { ...r, cost: e.target.value } : r))}
                      placeholder="0.00"
                      className="input pl-7"
                    />
                  </div>
                  {materials.length > 1 && (
                    <button type="button" onClick={() => setMaterials(materials.filter((r) => r.id !== row.id))}
                      className="text-slate-400 hover:text-red-600 px-2 py-2 text-lg leading-none">&times;</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setMaterials([...materials, newRow()])}
                className="text-sm text-brand-600 hover:underline">+ Add material</button>
              <p className="text-xs text-slate-500">
                The cost comes off the sale price automatically. The tech sees what to pick up; the cost stays in the office.
              </p>
            </>
          )}
        </Section>

        <Section title="Other Costs">
          {otherCosts.length === 0 ? (
            <p className="text-sm text-slate-500">Permits, dump fees, equipment hire &mdash; anything that is not material or labor.</p>
          ) : (
            otherCosts.map((row) => (
              <div key={row.id} className="flex gap-2 items-start">
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => setOtherCosts(otherCosts.map((r) => r.id === row.id ? { ...r, name: e.target.value } : r))}
                  placeholder="What the cost is for"
                  className="input flex-1"
                />
                <div className="relative w-32 shrink-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number" step="0.01" min="0"
                    value={row.cost}
                    onChange={(e) => setOtherCosts(otherCosts.map((r) => r.id === row.id ? { ...r, cost: e.target.value } : r))}
                    placeholder="0.00"
                    className="input pl-7"
                  />
                </div>
                <button type="button" onClick={() => setOtherCosts(otherCosts.filter((r) => r.id !== row.id))}
                  className="text-slate-400 hover:text-red-600 px-2 py-2 text-lg leading-none">&times;</button>
              </div>
            ))
          )}
          <button type="button" onClick={() => setOtherCosts([...otherCosts, newRow()])}
            className="text-sm text-brand-600 hover:underline">+ Add a cost</button>
        </Section>

        <Section title="Notes for the tech">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mb-2">
            <input type="checkbox" checked={noNotes} onChange={(e) => setNoNotes(e.target.checked)} className="rounded" />
            Nothing extra to know
          </label>
          {!noNotes && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="input"
              placeholder="Gate code, dog in the yard, park on the street, pick up the part on the way..."
            />
          )}
        </Section>

        <Section title="Assign Technicians">
          {technicians.length === 0 ? (
            <p className="text-sm text-slate-500">
              No technicians yet. Add some in the Employees section first.
            </p>
          ) : (
            <div className="space-y-2">
              {technicians.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={assignedTechIds.includes(t.id)}
                    onChange={() => toggleTech(t.id)}
                    className="rounded"
                  />
                  {t.name}
                </label>
              ))}
            </div>
          )}
        </Section>

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
            {loading ? "Creating..." : "Create Job"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/tm/admin/jobs")}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
        </div>
      </form>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.5rem;
          background-color: white;
          font-size: 0.875rem;
          /* No colour was set here, so a filled-in field inherited something
             washed out and read as empty placeholder text. On a page whose
             whole point is "this is already filled in for you", that is the
             one thing it must not look like. */
          color: rgb(15 23 42);
          font-weight: 500;
        }
        .input::placeholder {
          color: rgb(148 163 184);
          font-weight: 400;
        }
        .input:focus {
          outline: 2px solid rgb(37 99 235);
          outline-offset: -1px;
        }
      `}</style>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-1">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}