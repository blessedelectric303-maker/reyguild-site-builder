// Procedures are written once, universally, with bracketed placeholders.
// This fills them in from the company's own profile and settings, so the
// same wording serves every company without anybody rewriting it.
//
// [COMPANY NAME] -> the company profile name
// [MANAGER ROLE] -> whatever that company calls the person who decides
// Anything we cannot resolve is left visible, so it is obvious what still
// needs filling in under Settings rather than quietly reading as blank.

export type CompanyFacts = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  owner_name?: string | null;
  trade?: string | null;
  settings?: Record<string, any> | null;
};

function normalise(token: string): string {
  return token.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export function buildTokenMap(c: CompanyFacts): Record<string, string> {
  const s = c.settings || {};
  const map: Record<string, string> = {};

  const put = (key: string, value: any) => {
    const v = value == null ? "" : String(value).trim();
    if (v) map[normalise(key)] = v;
  };

  put("company name", c.name);
  put("company", c.name);
  put("company phone", c.phone);
  put("phone", c.phone);
  put("company email", c.email);
  put("email", c.email);
  put("website", c.website);
  put("owner", c.owner_name);
  put("owner name", c.owner_name);
  put("trade", c.trade);

  const street = [c.address, c.city, c.state, c.zip].filter(Boolean).join(", ");
  put("company address", street);
  put("address", street);

  // Everything the company sets for itself wins over the defaults above.
  Object.keys(s).forEach((k) => put(k, s[k]));

  return map;
}

// Replaces [TOKEN] and {{setting:token}} wherever they appear.
export function fillTokens(text: string | null | undefined, map: Record<string, string>): string {
  if (!text) return "";
  let out = String(text);

  out = out.replace(/\{\{\s*setting:([^}]+)\}\}/gi, (whole, key) => {
    const hit = map[normalise(key)];
    return hit || whole;
  });

  out = out.replace(/\[([^\][]{1,40})\]/g, (whole, key) => {
    const hit = map[normalise(key)];
    return hit || whole;
  });

  return out;
}

// True when something is still unfilled, so the screen can say so once
// rather than leaving the reader to spot brackets in a wall of text.
export function hasUnfilled(text: string | null | undefined, map: Record<string, string>): boolean {
  if (!text) return false;
  const found = String(text).match(/\[([^\][]{1,40})\]/g);
  if (!found) return false;
  return found.some((f) => !map[normalise(f.slice(1, -1))]);
}
