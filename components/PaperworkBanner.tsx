import Link from "next/link";
import { paperworkState, PAPERWORK_DAYS } from "@/lib/signingGate";

// THE COUNTDOWN, WHEREVER THEY LAND.
//
// Two emails on day three and day six would reach an inbox nobody on a roof
// opens. A line across the top of the app reaches them every single time they
// clock in, and it gets louder as the week runs down: a quiet note at first,
// gold in the middle, red on the last day. Nobody arrives at day eight
// surprised, and nobody has to go looking - it says where the documents live.
//
// It is about the COMPANY BOOKLET only. The four ReyGuild documents are a hard
// gate, so a person who still owes one of those is never looking at the app to
// begin with - they are on the paperwork page. Counting them here would have
// this banner nagging about something the person cannot currently see.
//
// It renders nothing at all once the booklet is done, which is most people most
// of the time.
export default async function PaperworkBanner() {
  const s = await paperworkState();
  if (s.companyOutstanding === 0 || s.locked) return null;

  const urgent = s.daysLeft <= 1;
  const warn = s.daysLeft <= PAPERWORK_DAYS - 3 && !urgent;

  const bg = urgent ? "#7A1F16" : warn ? "#CC9000" : "rgba(204,144,0,.12)";
  const fg = urgent ? "#FFE9E4" : warn ? "#16243F" : "#E8D5A8";
  const border = urgent ? "#BC4A3C" : warn ? "#CC9000" : "rgba(204,144,0,.45)";

  // Past the week an owner is still here - he is told, not blocked - so the
  // line has to keep making sense at zero instead of reading "0 days left".
  const when = s.overdue
    ? "This is past due."
    : s.daysLeft === 1
      ? "Today is the last day."
      : s.daysLeft === 2
        ? "You have 2 days left."
        : "You have " + s.daysLeft + " days left.";

  const what =
    s.companyOutstanding === 1
      ? "1 company document still needs your signature."
      : s.companyOutstanding + " company documents still need your signature.";

  const after = s.boss
    ? "They are in Settings under Company Documents. Your people cannot be asked to sign what you have not signed yourself."
    : "They are in Settings under Company Documents. After that the app stops there until they are done.";

  return (
    <div
      style={{
        border: "1px solid " + border,
        background: bg,
        color: fg,
        borderRadius: 10,
        padding: "12px 14px",
        margin: "0 0 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        fontSize: 14,
        lineHeight: 1.45,
      }}
    >
      <span style={{ fontWeight: 700 }}>{what}</span>
      <span style={{ opacity: 0.9 }}>
        {when} {after}
      </span>
      <Link
        href="/onboarding"
        style={{
          marginLeft: "auto",
          background: urgent ? "#FFE9E4" : "#16243F",
          color: urgent ? "#7A1F16" : "#E8D5A8",
          borderRadius: 8,
          padding: "8px 14px",
          fontSize: 13,
          fontWeight: 700,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Open my documents
      </Link>
    </div>
  );
}
