"use client";

import { useEffect } from "react";

// Reads the size chosen under Preferences and applies it to the tech screens.
// Reset on unmount so navigating out to the command center does not carry a
// larger base size with it.
export default function TechTextSize() {
  useEffect(() => {
    const map: Record<string, string> = {
      normal: "100%",
      large: "112%",
      xlarge: "125%",
    };
    try {
      const saved = localStorage.getItem("reyguild-tech-textsize") || "normal";
      document.documentElement.style.fontSize = map[saved] || "100%";
    } catch (e) {
      // private browsing - leave the default alone
    }
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, []);
  return null;
}
