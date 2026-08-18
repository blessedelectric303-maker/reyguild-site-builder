"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { itemName: string; qty: string; unit: string; notes: string };

type GpsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; lat: number; lng: number; accuracy: number; distanceMiles: number; withinGeofence: boolean }
  | { status: "error"; message: string };

export default function RequestForm({
  jobId,
  jobLat,
  jobLng,
  geofenceMiles,
}: {
  jobId: string;
  jobLat: number | null;
  jobLng: number | null;
  geofenceMiles: number;
}) {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<Item[]>([{ itemName: "", qty: "1", unit: "", notes: "" }]);
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [gps, setGps] = useState<GpsState>({ status: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 3958.8;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function refreshGps() {
    if (!("geolocation" in navigator)) {
      setGps({ status: "error", message: "GPS not supported." });
      return;
    }
    setGps({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        const dist =
          jobLat !== null && jobLng !== null ? distanceMiles(lat, lng, jobLat, jobLng) : 999;
        setGps({
          status: "ready",
          lat,
          lng,
          accuracy,
          distanceMiles: dist,
          withinGeofence: dist <= geofenceMiles,
        });
      },
      (err) => {
        setGps({
          status: "error",
          message:
            err.code === 1
              ? "Location access denied. Enable location in your browser."
              : "Could not get location.",
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  useEffect(() => {
    refreshGps();
  }, []);

  function addItem() {
    setItems([...items, { itemName: "", qty: "1", unit: "", notes: "" }]);
  }

  function removeItem(i: number) {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: keyof Item, value: string) {
    const next = [...items];
    next[i][field] = value;
    setItems(next);
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Photo must be under 10 MB.");
      return;
    }
    setError(null);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    setError(null);

    const cleanedItems: { itemName: string; qty: number; unit?: string; notes?: string }[] = [];
    for (const it of items) {
      const name = it.itemName.trim();
      const qtyStr = it.qty.trim();
      if (!name && !qtyStr) continue;
      if (!name) {
        setError("Each item needs a name.");
        return;
      }
      if (!qtyStr) {
        setError("Each item needs a quantity. Missing on: " + name);
        return;
      }
      const qtyNum = Number(qtyStr);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        setError("Quantity must be a positive number on: " + name);
        return;
      }
      cleanedItems.push({
        itemName: name,
        qty: qtyNum,
        unit: it.unit.trim() || undefined,
        notes: it.notes.trim() || undefined,
      });
    }

    if (cleanedItems.length === 0) {
      setError("Add at least one item with name and quantity.");
      return;
    }

    if (!photo) {
      setError("Please add a photo showing why you need these materials.");
      return;
    }
    if (gps.status !== "ready") {
      setError("Waiting for GPS. Tap refresh and try again.");
      return;
    }
    if (!gps.withinGeofence) {
      setError("You must be within " + geofenceMiles + " mile(s) of the job to submit.");
      return;
    }

    setSubmitting(true);

    const fd = new FormData();
    fd.append("jobId", jobId);
    fd.append("notes", notes);
    fd.append("items", JSON.stringify(cleanedItems));
    fd.append("lat", String(gps.lat));
    fd.append("lng", String(gps.lng));
    fd.append("photo", photo);

    try {
      const res = await fetch("/api/tech/material-requests", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Submission failed");
        setSubmitting(false);
        return;
      }
      router.push("/tm/tech/jobs/" + jobId);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Items needed</h2>
        {items.map((item, i) => (
          <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">Item {i + 1}</span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="Item name (e.g., 12-gauge wire)"
              value={item.itemName}
              onChange={(e) => updateItem(i, "itemName", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Quantity"
                value={item.qty}
                onChange={(e) => updateItem(i, "qty", e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              />
              <input
                type="text"
                placeholder="Unit (ft, box, ea)"
                value={item.unit}
                onChange={(e) => updateItem(i, "unit", e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              />
            </div>
            <input
              type="text"
              placeholder="Notes (optional)"
              value={item.notes}
              onChange={(e) => updateItem(i, "notes", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="w-full border-2 border-dashed border-slate-300 rounded-lg py-2 text-sm text-slate-600 hover:border-brand-400 hover:text-brand-600"
        >
          + Add another item
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Photo (required)</h2>
        <p className="text-xs text-slate-500">Take a new photo or upload one from your gallery showing why you need these materials.</p>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPhotoChange}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={onPhotoChange}
          className="hidden"
        />
        {photoPreview ? (
          <div className="space-y-2">
            <img src={photoPreview} alt="Preview" className="w-full rounded-lg" />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg py-2 text-sm text-slate-600 hover:border-brand-400 hover:text-brand-600"
              >
                📷 Take photo
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg py-2 text-sm text-slate-600 hover:border-brand-400 hover:text-brand-600"
              >
                🖼 Choose from gallery
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-lg py-8 text-sm text-slate-600 hover:border-brand-400 hover:text-brand-600"
            >
              📷 Take photo
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-lg py-8 text-sm text-slate-600 hover:border-brand-400 hover:text-brand-600"
            >
              🖼 Choose from gallery
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Notes (optional)</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Anything the office should know..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Location</h2>
        {gps.status === "loading" && <p className="text-sm text-slate-500">Getting location...</p>}
        {gps.status === "error" && (
          <div className="text-sm text-red-700">
            {gps.message}{" "}
            <button onClick={refreshGps} className="underline">
              Try again
            </button>
          </div>
        )}
        {gps.status === "ready" && (
          <div className="text-sm">
            <div className="flex items-center gap-2">
              <span
                className={
                  "inline-block w-2 h-2 rounded-full " +
                  (gps.withinGeofence ? "bg-emerald-500" : "bg-red-500")
                }
              />
              <span className="font-medium text-slate-900">
                {gps.distanceMiles.toFixed(2)} miles from job
              </span>
              <button onClick={refreshGps} className="text-xs text-brand-600 underline ml-auto">
                refresh
              </button>
            </div>
            {!gps.withinGeofence && (
              <p className="text-xs text-red-700 mt-1">
                You must be within {geofenceMiles} mile(s) of the job to submit.
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || gps.status !== "ready" || !gps.withinGeofence}
        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit Request"}
      </button>
    </div>
  );
}
