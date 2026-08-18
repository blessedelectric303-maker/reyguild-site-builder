"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function PurchaseForm({
  jobId,
  approvedRequests,
}: {
  jobId: string;
  approvedRequests: { id: string; label: string }[];
}) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [vendor, setVendor] = useState("");
  const [invoice, setInvoice] = useState("");
  const [total, setTotal] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [fulfillmentNotes, setFulfillmentNotes] = useState("");
  const [linkedRequestId, setLinkedRequestId] = useState("");
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
    const totalNum = Number(total);
    if (isNaN(totalNum) || totalNum <= 0) {
      setError("Enter a valid total amount");
      return;
    }
    if (!date) {
      setError("Pick a purchase date");
      return;
    }
    const trimmedFulfillment = fulfillmentNotes.trim();
    if (trimmedFulfillment.length < 10) {
      setError(
        "Pickup or delivery instructions are required (at least 10 characters) so techs know how they'll get the material."
      );
      return;
    }

    setSubmitting(true);
    const fd = new FormData();
    fd.append("jobId", jobId);
    fd.append("vendor", vendor);
    fd.append("invoiceNumber", invoice);
    fd.append("totalAmount", String(totalNum));
    fd.append("purchaseDate", date);
    fd.append("notes", "");
    fd.append("fulfillmentNotes", trimmedFulfillment);
    if (linkedRequestId) fd.append("linkedRequestId", linkedRequestId);
    if (receipt) fd.append("receipt", receipt);

    try {
      const res = await fetch("/api/admin/purchases", {
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
        <Field label="Vendor (optional)">
          <input
            type="text"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="Home Depot, Platt Electric, etc."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </Field>

        <Field label="Invoice / receipt # (optional)">
          <input
            type="text"
            value={invoice}
            onChange={(e) => setInvoice(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Total amount *">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </Field>

          <Field label="Purchase date *">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </Field>
        </div>

        {approvedRequests.length > 0 && (
          <Field label="Fulfills approved request (optional)">
            <select
              value={linkedRequestId}
              onChange={(e) => setLinkedRequestId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="">— None —</option>
              {approvedRequests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Pickup or delivery instructions for the tech *
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            How will the tech get this material? They will see this on the job
            page. Be specific: pickup location, contact name, delivery time, etc.
          </p>
        </div>
        <textarea
          value={fulfillmentNotes}
          onChange={(e) => setFulfillmentNotes(e.target.value)}
          rows={4}
          placeholder="Ben, pick up at Home Depot Northglenn, ask for Joe at the pro desk, after 3pm. Leave 30 min early."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Receipt photo</h2>
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
        {submitting ? "Logging..." : "Log Purchase"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
