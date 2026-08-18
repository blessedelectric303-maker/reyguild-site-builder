// ReyGuild logo lockup — crest (served from /public) + wordmark + tagline.
// Props: size (crest height in px, default 40), tagline (bool),
// dark (bool — flips "Guild" + tagline to light for dark headers),
// stacked (bool — crest on top, wordmark + tagline centered beneath).

export default function Logo({ size = 40, tagline = true, dark = false, stacked = false }) {
  const guildColor = dark ? "#F5F3EE" : "#16243F";
  const taglineColor = dark ? "#FFFFFF" : "#16243F";

  return (
    <span style={{ display: "inline-flex", flexDirection: stacked ? "column" : "row", alignItems: "center", gap: stacked ? 6 : 9 }}>
      <img
        src="/reyguild-crest.png"
        alt="ReyGuild"
        width={Math.round(size * 0.72)}
        height={size}
        style={{ display: "block", objectFit: "contain" }}
      />
      <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
        <span style={{ fontFamily: "'Archivo','Inter',system-ui,sans-serif", fontSize: Math.round(size * 0.52), fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1 }}>
          <span style={{ color: "#DFA63A" }}>Rey</span>
          <span style={{ color: guildColor }}>Guild</span>
        </span>
        {tagline && (
          <span style={{ fontFamily: "'JetBrains Mono',ui-monospace,monospace", color: taglineColor, fontSize: Math.max(7, Math.round(size * 0.19)), fontWeight: 500, letterSpacing: "0.3em", marginTop: 5, paddingLeft: "0.3em", whiteSpace: "nowrap" }}>
            T&amp;M &amp; P&amp;L
          </span>
        )}
      </span>
    </span>
  );
}
