"use client";

import { useRef, useState } from "react";

// THE SIGNING BOX. A finger on a phone, a stylus, or a mouse - the same pad
// the customer gets on a proposal, so a tech signing the handbook and a
// homeowner signing a proposal are doing the same thing in the same way.
// The picture leaves here as a PNG; the page above decides what to do with it.

export default function SignaturePad({
  onChange,
  disabled,
}: {
  onChange: (png: string) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (c.width / r.width),
      y: (e.clientY - r.top) * (c.height / r.height),
    };
  }
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (x) {}
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "#16243F";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    if (!hasDrawn) setHasDrawn(true);
    onChange(canvasRef.current!.toDataURL("image/png"));
  }
  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    if (hasDrawn) onChange(canvasRef.current!.toDataURL("image/png"));
  }
  function clear() {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
    onChange("");
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={520}
        height={150}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        className="w-full rounded-md border border-slate-300 bg-white"
        style={{ touchAction: "none", height: 150, cursor: "crosshair" }}
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {hasDrawn ? "Signed above." : "Sign above with your finger."}
        </span>
        <button type="button" onClick={clear} className="text-xs font-semibold text-slate-600 underline">
          Clear
        </button>
      </div>
    </div>
  );
}
