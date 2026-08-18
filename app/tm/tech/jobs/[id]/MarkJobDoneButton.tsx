"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PHOTOS = 20;

export default function MarkJobDoneButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setPhotos([]);
    setNotes("");
    setError("");
    setSubmitting(false);
  }

  function closeModal() {
    if (submitting) return;
    reset();
    setOpen(false);
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const picked = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-selecting the same file after removal

    const next = [...photos];
    for (const f of picked) {
      if (f.size > MAX_BYTES) {
        setError("Each photo must be under 10 MB. Skipped: " + f.name);
        continue;
      }
      // If the browser reports a type, validate it. Empty type (some HEIC) is left to the server.
      if (f.type && !ALLOWED_TYPES.includes(f.type)) {
        setError("Photos must be JPEG, PNG, WebP, or HEIC. Skipped: " + f.name);
        continue;
      }
      next.push(f);
    }

    if (next.length > MAX_PHOTOS) {
      setError("Maximum 20 photos per submission.");
      setPhotos(next.slice(0, MAX_PHOTOS));
      return;
    }
    setPhotos(next);
  }

  function removePhoto(idx: number) {
    setPhotos(photos.filter((_, i) => i !== idx));
  }

  async function submit() {
    setError("");
    if (photos.length === 0) {
      setError("At least 1 completion photo is required.");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      for (const p of photos) fd.append("photos", p);
      if (notes.trim()) fd.append("notes", notes.trim());

      const res = await fetch("/api/tech/jobs/" + jobId + "/mark-done", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      reset();
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
      >
        Mark Job Done
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-bold text-gray-900">Mark Job Done</h2>
            <p className="mb-4 text-sm text-gray-600">
              Add at least one completion photo. Notes are optional.
            </p>

            <div className="mb-3">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Completion photos ({photos.length} of {MAX_PHOTOS})
              </span>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleSelect}
                disabled={submitting}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleSelect}
                disabled={submitting}
                className="hidden"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={submitting}
                  className="border-2 border-dashed border-slate-300 rounded-lg py-6 text-sm text-slate-600 hover:border-brand-400 hover:text-brand-600 disabled:opacity-50"
                >
                  📷 Take photo
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={submitting}
                  className="border-2 border-dashed border-slate-300 rounded-lg py-6 text-sm text-slate-600 hover:border-brand-400 hover:text-brand-600 disabled:opacity-50"
                >
                  🖼 Choose from gallery
                </button>
              </div>
            </div>

            {photos.length > 0 ? (
              <ul className="mb-3 max-h-40 overflow-y-auto rounded-md border border-gray-200">
                {photos.map((p, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between border-b border-gray-100 px-3 py-2 text-sm last:border-b-0"
                  >
                    <span className="truncate pr-2 text-gray-700">{p.name}</span>
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      disabled={submitting}
                      className="shrink-0 text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Notes (optional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                rows={3}
                maxLength={2000}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Anything the office should know before invoicing…"
              />
            </label>

            {error ? (
              <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting || photos.length === 0}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
