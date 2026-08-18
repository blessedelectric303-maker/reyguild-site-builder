"use client";

import { useState } from "react";

type Faq = {
  q: string;
  keywords: string[];
  a: string;
};

const FAQS: Faq[] = [
  {
    q: "How do I clock in or out of a job?",
    keywords: ["clock", "clockin", "clock in", "clock out", "clockout", "punch", "time in", "start job", "log hours"],
    a: "You must be within one mile of the job site to clock in or out. Before your first clock-in, make sure: (1) you're within a mile of the job, (2) the app has permission to access your location, and (3) your device's precise/exact location is turned on. Once all three are set, refresh the app and try again.\n\nNote: clocking out also requires you to be within a mile of the job — you can't clock out once you've left for home.",
  },
  {
    q: "How do I request time off?",
    keywords: ["time off", "timeoff", "vacation", "sick", "pto", "day off", "leave", "request off"],
    a: "Open the Time Off tab in your employee app. Choose the type of time off you want — the screen also shows how many sick-time hours you have available, which you can request as well. Select your dates: each full day counts as 8 hours and a half day as 4 hours automatically, or you can enter custom hours if you need to.",
  },
  {
    q: "How do I request extra time or materials on a job?",
    keywords: ["materials", "material", "extra time", "extra", "request", "supplies", "parts", "more time", "order"],
    a: "You must be on the job site (within one mile) to submit a request — it won't work from home. Enter what you're requesting and the quantity, add any notes if needed, and attach a photo showing why it's needed. Then submit.",
  },
  {
    q: "Why is my screen read-only or locked?",
    keywords: ["locked", "read only", "read-only", "readonly", "lock", "can't edit", "cant edit", "frozen", "disabled"],
    a: "This happens when your company's free trial or subscription has lapsed. Your data is safe and nothing has been deleted. Please contact your company owner to reactivate the account.",
  },
  {
    q: "I forgot my password.",
    keywords: ["password", "forgot", "reset", "can't log in", "cant log in", "login", "sign in", "locked out"],
    a: "Go to the login page and tap \"Forgot password?\". Enter your email and we'll send you a reset link. The link expires in one hour.",
  },
  {
    q: "How do I add an employee? (admin)",
    keywords: ["add employee", "new employee", "add user", "add worker", "new user", "hire", "add tech", "add staff"],
    a: "Only an administrator can add employees, and it's done through the Employees tab.",
  },
  {
    q: "How do I create a job? (admin)",
    keywords: ["create job", "new job", "add job", "make job", "start a job", "schedule job"],
    a: "An administrator can create a job from the Jobs tab. Once created, a job can be assigned and given edit access as needed.",
  },
];

export default function HelpWidget({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeFaq, setActiveFaq] = useState<Faq | null>(null);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const matches = q.length === 0
    ? FAQS
    : FAQS.filter(
        (f) =>
          f.q.toLowerCase().includes(q) ||
          f.keywords.some((k) => q.includes(k) || k.includes(q))
      );

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <div className="font-bold text-slate-900">
              <span className="text-gold-600">Rey</span><span className="text-brand-700">Guild</span> Help
            </div>
            <div className="text-xs text-slate-500">Find a quick answer below</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close help" className="p-2 -mr-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeFaq ? (
            <div>
              <button type="button" onClick={() => setActiveFaq(null)} className="text-xs text-brand-600 hover:underline mb-3">
                ← Back to all topics
              </button>
              <h3 className="font-semibold text-slate-900 mb-2">{activeFaq.q}</h3>
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{activeFaq.a}</p>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type your question..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4 text-sm"
                autoFocus
              />

              {matches.length > 0 ? (
                <div className="space-y-2">
                  {matches.map((f) => (
                    <button
                      key={f.q}
                      type="button"
                      onClick={() => setActiveFaq(f)}
                      className="w-full text-left px-3 py-2.5 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50 text-sm text-slate-800"
                    >
                      {f.q}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500 py-2">
                  No matching topic found. You can email us below and we&apos;ll help you out.
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-slate-200 px-5 py-4">
          <p className="text-xs text-slate-500 mb-2">Still need help?</p>
          <a href="mailto:support@reyguild.com?subject=ReyGuild%20support%20request" className="block w-full text-center bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 rounded-lg">
            Email support
          </a>
        </div>
      </div>
    </div>
  );
}
