"use client";

import { useEffect, useState } from "react";

// THE OPENING SCREEN.
//
// Shown once per browser session, not on every page. "Every time you open the
// app" means when somebody arrives - not every time they tap Jobs. A splash
// that replays on every navigation stops being an entrance and becomes an
// obstacle, and a tech opening twelve jobs a day would learn to hate it.
//
// It dismisses itself after the animation, or the moment anybody taps. Nobody
// should ever be made to wait for a logo.

const KEY = "rg_splash_seen";

export default function Splash() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch {
      // Private browsing with storage blocked. Show it once and move on
      // rather than failing.
    }
    setShow(true);
    const t1 = setTimeout(() => setLeaving(true), 2400);
    const t2 = setTimeout(() => setShow(false), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!show) return null;

  function skip() {
    setLeaving(true);
    setTimeout(() => setShow(false), 500);
  }

  // Rising sparks. Positions are fixed rather than random so the server and
  // the browser render the same thing - random values here cause a hydration
  // mismatch and React throws the whole tree away.
  const sparks = [
    { l: 12, d: 0.1, s: 3.2 }, { l: 24, d: 0.7, s: 2.6 },
    { l: 38, d: 0.3, s: 3.6 }, { l: 47, d: 1.1, s: 2.9 },
    { l: 58, d: 0.5, s: 3.3 }, { l: 69, d: 0.9, s: 2.7 },
    { l: 81, d: 0.2, s: 3.5 }, { l: 91, d: 1.3, s: 3.0 },
  ];

  return (
    <div
      className={"rg-splash" + (leaving ? " rg-splash--out" : "")}
      onClick={skip}
      role="presentation"
      aria-hidden="true"
    >
      <div className="rg-splash__glow" />

      {sparks.map((sp, i) => (
        <span
          key={i}
          className="rg-splash__spark"
          style={{
            left: sp.l + "%",
            animationDelay: sp.d + "s",
            animationDuration: sp.s + "s",
          }}
        />
      ))}

      <div className="rg-splash__stage">
        <div className="rg-splash__ring" />
        <div className="rg-splash__crest" />
        <div className="rg-splash__sheen" />
      </div>

      <div className="rg-splash__word">
        <span className="rg-rey">Rey</span>
        <span className="rg-guild">Guild</span>
      </div>
      <div className="rg-splash__tag">Service Company Software</div>
    </div>
  );
}
