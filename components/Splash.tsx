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

// NO FLASH OF THE PAGE BEFORE THE SPLASH.
//
// The first version started hidden and switched itself on in an effect, which
// runs AFTER the browser has already painted. So the command centre, or the
// proposal, appeared for a frame, the splash dropped on top of it, and then
// it cleared - an entrance that looked like a glitch.
//
// Now the markup is in the HTML from the first byte, so it covers the page on
// the very first paint. A tiny script in the layout runs before this paints
// and marks the document when the splash has already been seen this session,
// and CSS hides it with no JavaScript involved. React then removes it.
export default function Splash() {
  // Starts VISIBLE, and the server renders it the same way, so there is no
  // hydration mismatch and nothing to wait for.
  const [gone, setGone] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = !!sessionStorage.getItem(KEY);
      if (!seen) sessionStorage.setItem(KEY, "1");
    } catch {
      // Private browsing with storage blocked. Show it once and move on
      // rather than failing.
    }
    if (seen) {
      // Already hidden by CSS before this ran - just take it out of the tree.
      setGone(true);
      return;
    }
    const t1 = setTimeout(() => setLeaving(true), 2400);
    const t2 = setTimeout(() => setGone(true), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  function skip() {
    setLeaving(true);
    setTimeout(() => setGone(true), 500);
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

      {/* THE NAME IS ARTWORK NOW, NOT TYPE.
          It used to be two spans in a web font, which meant the logo on the
          splash and the logo on everything else were two different things
          that only looked alike. This is the mark itself - the same file,
          the same chrome, the same letters - so there is one logo. It still
          arrives on its own beat after the crest lands. */}
      <img
        className="rg-splash__mark"
        src="/logo/reyguild-wordmark.png"
        alt="ReyGuild - Service Company Software"
      />
    </div>
  );
}
