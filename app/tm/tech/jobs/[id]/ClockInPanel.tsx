"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type GpsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; lat: number; lng: number; accuracy: number; distanceMiles: number; withinGeofence: boolean }
  | { status: "error"; message: string };

export default function ClockInPanel({
  jobId,
  jobLat,
  jobLng,
  geofenceMiles,
  isClockedInHere,
  clockInAt,
  isClockedInElsewhere,
  currentStatus,
}: {
  jobId: string;
  jobLat: number | null;
  jobLng: number | null;
  geofenceMiles: number;
  isClockedInHere: boolean;
  clockInAt: string | null;
  isClockedInElsewhere: boolean;
  currentStatus: string;
}) {
  const router = useRouter();
  const [gps, setGps] = useState<GpsState>({ status: "idle" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setGps({ status: "error", message: "GPS not supported on this device." });
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
              ? "Location access denied. Enable location in your browser settings."
              : "Could not get location. Try again.",
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  useEffect(() => {
    refreshGps();
  }, []);

  async function callApi(path: string, body: any, busyLabel: string) {
    setBusy(busyLabel);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setBusy(null);
        return false;
      }
      router.refresh();
      setBusy(null);
      return true;
    } catch {
      setError("Network error. Try again.");
      setBusy(null);
      return false;
    }
  }

  async function handleClockIn() {
    if (gps.status !== "ready") {
      setError("Waiting for GPS. Try refreshing location.");
      return;
    }
    // Distance is NOT checked here. The geofence applies only to the first job
    // of the day, and the server is the only side that knows which job that is.
    // It will refuse with a clear message if this is the first one.
    await callApi(
      "/api/tech/clock-in",
      { jobId, lat: gps.lat, lng: gps.lng, accuracy: gps.accuracy },
      "clock-in"
    );
  }

  async function handleClockOut() {
    if (gps.status !== "ready") {
      setError("Waiting for GPS. Try refreshing location.");
      return;
    }
    await callApi(
      "/api/tech/clock-out",
      { lat: gps.lat, lng: gps.lng, accuracy: gps.accuracy },
      "clock-out"
    );
  }

  async function handleStatusUpdate(updateType: string) {
    if (gps.status !== "ready") {
      setError("Waiting for GPS. Try refreshing location.");
      return;
    }
    await callApi(
      "/api/tech/status-update",
      { jobId, updateType, lat: gps.lat, lng: gps.lng, accuracy: gps.accuracy },
      updateType
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">Your Location</div>

      {gps.status === "loading" && (
        <div className="text-sm text-slate-500">Getting your location...</div>
      )}

      {gps.status === "error" && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {gps.message}
          <button
            onClick={refreshGps}
            className="ml-2 underline font-medium"
          >
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
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Accuracy: -{Math.round(gps.accuracy)}m  - {" "}
            <button onClick={refreshGps} className="underline">
              refresh
            </button>
          </div>
          {!gps.withinGeofence && (
            <div className="text-xs text-red-700 mt-2">
              You are outside the {geofenceMiles} mile radius. That is fine on any job
              except the first of the day - the first one has to be clocked in at
              the address. Either way your distance is recorded.
            </div>
          )}
        </div>
      )}

      <div className="border-t border-slate-200 pt-3 space-y-2">
        {isClockedInHere ? (
          <>
            <div className="text-center bg-emerald-50 border border-emerald-200 rounded-lg py-3">
              <div className="text-xs uppercase tracking-wide text-emerald-700">Clocked In</div>
              {clockInAt && (
                <div className="text-sm text-emerald-900 mt-0.5">
                  Since {new Date(clockInAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </div>
              )}
            </div>
            <button
              onClick={handleClockOut}
              disabled={busy !== null || gps.status !== "ready"}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
            >
              {busy === "clock-out" ? "Clocking out..." : "Clock Out"}
            </button>
          </>
        ) : isClockedInElsewhere ? (
          <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            You are clocked in on another job. Clock out there first.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleStatusUpdate("on_the_way")}
                disabled={busy !== null || gps.status !== "ready" || currentStatus !== "scheduled"}
                className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-2.5 rounded-lg text-sm disabled:opacity-50"
              >
                {busy === "on_the_way" ? "Updating..." : "On My Way"}
              </button>
              <button
                onClick={() => handleStatusUpdate("arrived")}
                disabled={busy !== null || gps.status !== "ready"}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg text-sm disabled:opacity-50"
              >
                {busy === "arrived" ? "Updating..." : "Arrived"}
              </button>
            </div>
            <button
              onClick={handleClockIn}
              disabled={
                busy !== null || gps.status !== "ready"
              }
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
            >
              {busy === "clock-in" ? "Clocking in..." : "Clock In"}
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}