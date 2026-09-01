type Rule = {
  section: string;
  rule: string;
  customer_facing: string;
  is_ours?: boolean;
};

// THE RULES THAT SIT ABOVE INDIVIDUAL PRICES.
//
// The circuit rule, the drywall rule, the panel checkpoint - things that are
// true across a whole section of the price book and belong nowhere in a price
// row.
//
// The important part is the CUSTOMER FACING flag, taken straight out of Ben's
// own book. Some of these are internal and repeating one to a customer is how
// an estimator creates a liability: "just reset the breaker" is advice, and
// advice is something you can be held to.

const TONE: Record<string, { label: string; cls: string }> = {
  No: { label: "Internal only", cls: "bg-red-100 text-red-800" },
  Yes: { label: "Say it out loud", cls: "bg-emerald-100 text-emerald-800" },
  Partial: { label: "Partly sayable", cls: "bg-amber-100 text-amber-900" },
  "After verification": {
    label: "Only after you have checked",
    cls: "bg-sky-100 text-sky-900",
  },
  "Approval language only": {
    label: "Approval wording only",
    cls: "bg-sky-100 text-sky-900",
  },
  "Scope can show footage": {
    label: "May appear in the written scope",
    cls: "bg-emerald-100 text-emerald-800",
  },
};

export default function SectionRules({ rules }: { rules: Rule[] }) {
  if (!rules.length) return null;

  const sections: string[] = [];
  rules.forEach((r) => {
    if (!sections.includes(r.section)) sections.push(r.section);
  });

  return (
    <div className="mt-6">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
        Rules for this price book
      </h2>
      <p className="mt-1 text-xs leading-snug text-slate-500">
        These sit above individual prices. Read the tag before you repeat one to
        a customer.
      </p>

      <div className="mt-3 space-y-4">
        {sections.map((sec) => (
          <div key={sec}>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-600">
              {sec}
            </div>
            <ul className="mt-2 space-y-2">
              {rules
                .filter((r) => r.section === sec)
                .map((r, i) => {
                  const tone = TONE[r.customer_facing] || {
                    label: r.customer_facing,
                    cls: "bg-slate-100 text-slate-700",
                  };
                  return (
                    <li
                      key={i}
                      className={
                        "rounded-lg border bg-white p-3 " +
                        (r.customer_facing === "No"
                          ? "border-red-200"
                          : "border-slate-200")
                      }
                    >
                      <span
                        className={
                          "inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide " +
                          tone.cls
                        }
                      >
                        {tone.label}
                      </span>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-800">
                        {r.rule}
                      </p>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
