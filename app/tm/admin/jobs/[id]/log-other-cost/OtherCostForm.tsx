"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function OtherCostForm({ jobId }: { jobId: string }) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Receipt must be an image");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Receipt must be under 10 MB");
      return;
    }
    setError(null);
    setReceipt(file);
    setReceiptPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    setError(null);

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setError("Enter a description (e.g. 'Permit fee', 'Joe&apos;s Drywall')");
      return;
    }
    if (trimmedDescription.length > 200) {
      setError("Description is too long (max 200 characters)");
      return;
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Enter a valid amount");
      return;
    }

    setSubmitting(true);
    const fd = new FormData();
    fd.append("jobId", jobId);
    fd.append("description", trimmedDescription);
    fd.append("amount", String(amountNum));
    fd.append("notes", notes.trim());
    if (receipt) fd.append("receipt", receipt);

    try {
      const res = await fetch("/api/admin/other-job-costs", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Submission failed");
        setSubmitting(false);
        return;
      }
      router.push("/tm/admin/jobs/" + jobId);
      router.refresh();
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <Field label="Description *">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Permit fee, Joe's Drywall, equipment rental..."
            maxLength={200}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </Field>

        <Field label="Amount *">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </Field>

        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Anything to remember about this cost..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </Field>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Receipt photo (optional)
        </h2>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onReceiptChange}
          className="hidden"
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          onChange={onReceiptChange}
          className="hidden"
        />
        {receiptPreview ? (
          <div className="space-y-2">
            <img
              src={receiptPreview}
              alt="Receipt"
              className="w-full max-h-80 object-contain rounded-lg bg-slate-50"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg py-2 text-sm text-slate-600 hover:border-brand-400 hover:text-brand-600"
              >
                📷 Take photo
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
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
              onClick={() => cameraRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-lg py-8 text-sm text-slate-600 hover:border-brand-400 hover:text-brand-600"
            >
              📷 Take photo
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-lg py-8 text-sm text-slate-600 hover:border-brand-400 hover:text-brand-600"
            >
              🖼 Choose from gallery
            </button>
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
        disabled={submitting}
        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
      >
        {submitting ? "Logging..." : "Log Cost"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
