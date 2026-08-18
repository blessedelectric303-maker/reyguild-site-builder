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

export default function NewJobForm({ technicians }: { technicians: Technician[] }) {
  const router = useRouter();
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [salePrice, setSalePrice] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [scopeOfWork, setScopeOfWork] = useState("");
  const [assignedTechIds, setAssignedTechIds] = useState<string[]>([]);
  const [mapsReady, setMapsReady] = useState(false);

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
          assignedTechIds,
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