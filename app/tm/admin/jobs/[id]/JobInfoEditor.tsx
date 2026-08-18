"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";

declare global {
  interface Window {
    google: any;
  }
}

function toDatetimeLocal(d: Date | string | null): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  return yyyy + "-" + mm + "-" + dd + "T" + hh + ":" + mi;
}

export default function JobInfoEditor({
  jobId,
  initial,
}: {
  jobId: string;
  initial: {
    customerName: string;
    customerPhone: string | null;
    customerEmail: string | null;
    jobAddress: string;
    lat: number | null;
    lng: number | null;
    scheduledStart: string | null;
    scheduledEnd: string | null;
    jobDescription: string | null;
  };
}) {
  const router = useRouter();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  const [open, setOpen] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);

  const [customerName, setCustomerName] = useState(initial.customerName);
  const [customerPhone, setCustomerPhone] = useState(initial.customerPhone || "");
  const [customerEmail, setCustomerEmail] = useState(initial.customerEmail || "");
  const [address, setAddress] = useState(initial.jobAddress);
  const [lat, setLat] = useState<number | null>(initial.lat);
  const [lng, setLng] = useState<number | null>(initial.lng);
  const [scheduledStart, setScheduledStart] = useState(
    toDatetimeLocal(initial.scheduledStart)
  );
  const [scheduledEnd, setScheduledEnd] = useState(
    toDatetimeLocal(initial.scheduledEnd)
  );
  const [jobDescription, setJobDescription] = useState(initial.jobDescription || "");
  const [reason, setReason] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !mapsReady || !addressInputRef.current || autocompleteRef.current) return;
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

    return () => {
      autocompleteRef.current = null;
    };
  }, [open, mapsReady]);

  function reset() {
    setCustomerName(initial.customerName);
    setCustomerPhone(initial.customerPhone || "");
    setCustomerEmail(initial.customerEmail || "");
    setAddress(initial.jobAddress);
    setLat(initial.lat);
    setLng(initial.lng);
    setScheduledStart(toDatetimeLocal(initial.scheduledStart));
    setScheduledEnd(toDatetimeLocal(initial.scheduledEnd));
    setJobDescription(initial.jobDescription || "");
    setReason("");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }
    if (!address.trim() || lat === null || lng === null) {
      setError(
        "Please type an address and pick a suggestion from the dropdown to set the location."
      );
      return;
    }
    if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      setError("Email is not in a valid format.");
      return;
    }
    if (reason.trim().length < 3) {
      setError("Please provide a brief reason (at least 3 characters).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/jobs/" + jobId + "/info", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || null,
          customerEmail: customerEmail.trim() || null,
          jobAddress: address.trim(),
          jobLat: lat,
          jobLng: lng,
          scheduledStartAt: scheduledStart || null,
          scheduledEndAt: scheduledEnd || null,
          jobDescription: jobDescription.trim() || null,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save.");
        setLoading(false);
        return;
      }

      setLoading(false);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-brand-600 hover:text-brand-700 font-medium"
      >
        Edit job info
      </button>
    );
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
        onSubmit={submit}
        className="bg-white rounded-xl border-2 border-brand-300 p-5 space-y-4 mt-2"
      >
        <h3 className="font-semibold text-slate-900">Edit job info</h3>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Customer Name *
          </label>
          <input
            type="text"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Job Address *
          </label>
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
            autoComplete="off"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          {lat !== null && lng !== null ? (
            <p className="text-xs text-emerald-700 mt-1">
              ✓ Location confirmed ({lat.toFixed(5)}, {lng.toFixed(5)})
            </p>
          ) : (
            <p className="text-xs text-amber-700 mt-1">
              Pick an address from the dropdown to update the geofence location.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Scheduled Start
            </label>
            <input
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Scheduled End
            </label>
            <input
              type="datetime-local"
              value={scheduledEnd}
              onChange={(e) => setScheduledEnd(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Scope of Work
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            placeholder="What work needs to be done..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Reason for change (required, audit-logged)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer corrected phone number"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            maxLength={500}
          />
        </div>

        {error && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => {
              reset();
              setOpen(false);
            }}
            disabled={loading}
            className="bg-white hover:bg-slate-100 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg border border-slate-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
