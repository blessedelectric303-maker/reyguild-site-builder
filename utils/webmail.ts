// Where the Email button on the command center goes.
//
// It used to be hardcoded to Gmail. It should open the COMPANY inbox - the
// address customers write to - so whoever is on the desk can work it.
//
// We cannot know every company's webmail, so we recognise the common ones
// from the address and fall back to composing a message. A company can
// override it with their own link in Settings.

export function webmailFor(email: string, override?: string): string {
  const o = (override || "").trim();
  if (o) return /^https?:\/\//i.test(o) ? o : "https://" + o.replace(/^\/+/, "");

  const addr = (email || "").trim();
  if (!addr || addr.indexOf("@") < 0) return "";
  const domain = addr.split("@")[1].toLowerCase();

  // Google Workspace addresses are not @gmail.com, so anything unrecognised
  // that a company set up through Google still needs the override field.
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return "https://mail.google.com";
  }
  if (["outlook.com", "hotmail.com", "live.com", "msn.com"].indexOf(domain) >= 0) {
    return "https://outlook.live.com/mail/";
  }
  if (domain === "yahoo.com" || domain === "ymail.com") {
    return "https://mail.yahoo.com";
  }
  if (domain === "icloud.com" || domain === "me.com") {
    return "https://www.icloud.com/mail";
  }
  if (domain === "aol.com") return "https://mail.aol.com";
  if (domain === "proton.me" || domain === "protonmail.com") {
    return "https://mail.proton.me";
  }

  // A company address on its own domain. Composing to it is the only thing
  // that works everywhere; the override field covers the rest.
  return "mailto:" + addr;
}
