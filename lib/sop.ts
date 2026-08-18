// ReyGuild handbook / SOP content.
// audience: "tech" = technicians only, "owner" = owners/admins only, "all" = everyone.
// references hrefs: "#id" jumps within the handbook, "/path" opens an app page, "mailto:" emails.

export type SopSection = {
  id: string;
  title: string;
  audience: "tech" | "owner" | "all";
  keywords: string[];
  body: string;
  references: { label: string; href: string }[];
};

export const sopSections: SopSection[] = [
  {
    id: "getting-started",
    title: "Creating your account",
    audience: "all",
    keywords: ["sign up", "signup", "register", "create account", "new account", "get started", "verify email", "verification"],
    body:
      "Go to the sign-up page and enter your company name, your name, work email, an optional phone number, and a password (at least 8 characters). Check the box to accept the Terms of Service and Privacy Policy, then tap Start free trial.\n\nWe email a verification link to the address you entered. Open that email and click the link to verify your account and begin your 14-day free trial. If the email does not arrive within a minute, check your spam folder.",
    references: [
      { label: "Go to sign up", href: "/signup" },
      { label: "Your free trial", href: "#trial" },
    ],
  },
  {
    id: "roles",
    title: "Owners vs technicians",
    audience: "all",
    keywords: ["role", "owner", "admin", "manager", "technician", "tech", "permissions", "access"],
    body:
      "ReyGuild has two kinds of users. Owners (and managers) get the full admin portal with the sidebar menu, where they dispatch jobs, approve material requests, log costs, and see the P&L. Technicians get the tech app, with three tabs: Jobs, My Hours, and Time Off.\n\nWhat you can see and do depends on your role. If something you expect is missing, your role may be set differently - ask your company owner.",
    references: [{ label: "Getting help", href: "#help" }],
  },
  {
    id: "trial",
    title: "Your 14-day free trial",
    audience: "all",
    keywords: ["trial", "free", "14 days", "price", "pricing", "cost", "how much", "subscription"],
    body:
      "Every new company starts with a 14-day free trial. No credit card is required to begin, and during the trial you have full access to everything.\n\nAfter the trial, pricing is $34.99/mo for your first 3 months, then $49.99/mo - one flat price for your whole team, unlimited users.",
    references: [{ label: "Billing and reactivation", href: "#billing" }],
  },
  {
    id: "login",
    title: "Signing in and resetting your password",
    audience: "all",
    keywords: ["login", "log in", "sign in", "password", "forgot password", "reset password", "locked out"],
    body:
      "Sign in from the login page with your work email and password. If you forget your password, tap Forgot password, enter your email, and we send you a reset link. Open it and choose a new password.\n\nReset links are time-limited, so if yours stops working, just request a new one.",
    references: [{ label: "Go to sign in", href: "/login" }],
  },
  {
    id: "tech-jobs",
    title: "Viewing your jobs (technicians)",
    audience: "tech",
    keywords: ["jobs", "my jobs", "assigned", "job list", "job details"],
    body:
      "Open the Jobs tab in the tech app to see the jobs assigned to you. Tap a job to see its details, any approved materials with pickup or delivery instructions, and the actions you can take on that job.",
    references: [{ label: "Requesting materials", href: "#materials" }],
  },
  {
    id: "materials",
    title: "Requesting materials (technicians)",
    audience: "tech",
    keywords: ["material request", "request materials", "need parts", "order materials", "supplies", "items"],
    body:
      "On a job, open Request materials. Add each item you need with a name, quantity, unit (ft, box, ea), and optional notes - tap Add another item for more. You must attach a photo showing why the materials are needed; you can take a new photo or upload one from your gallery.\n\nYou also have to be within 1 mile of the job site - the app checks your GPS location before letting you submit. When everything is filled in and you are in range, tap Submit Request. It goes to the office for approval.",
    references: [
      { label: "Photos: take or upload", href: "#photos" },
      { label: "GPS will not let me submit", href: "#gps" },
    ],
  },
  {
    id: "photos",
    title: "Adding photos - take new or upload from gallery",
    audience: "all",
    keywords: ["photo", "picture", "image", "upload", "gallery", "camera", "receipt photo"],
    body:
      "Anywhere ReyGuild asks for a photo (material requests, receipts, other costs), tap the photo button. Your phone offers Take Photo, Photo Library, and Choose File. Pick Take Photo to snap a new one, or Photo Library to use a picture you already took - handy if you photographed something earlier and want to attach it later.\n\nPhotos must be image files under 10 MB.",
    references: [],
  },
  {
    id: "purchases",
    title: "Logging a purchase or receipt (owners)",
    audience: "owner",
    keywords: ["purchase", "receipt", "buy materials", "log purchase", "vendor", "invoice", "material log"],
    body:
      "From a job, open Log purchase. Enter the vendor (optional), invoice or receipt number (optional), the total amount, and the purchase date. You must add pickup or delivery instructions for the tech (at least a sentence) so they know how to get the material - this shows on the job page. You can optionally attach a receipt photo and link the purchase to an approved material request.\n\nTap Log Purchase to save it to the job's costs.",
    references: [
      { label: "Other costs", href: "#other-costs" },
      { label: "Requesting materials", href: "#materials" },
    ],
  },
  {
    id: "other-costs",
    title: "Logging other costs (owners)",
    audience: "owner",
    keywords: ["other cost", "permit", "subcontractor", "equipment rental", "misc", "expense", "extra cost"],
    body:
      "Use Log other cost for job expenses that are not material purchases - permit fees, subcontractors, equipment rental, and similar. Enter a description, the amount, and optional notes, and you can attach a receipt photo. Tap Log Cost to add it to the job.",
    references: [{ label: "Logging a purchase", href: "#purchases" }],
  },
  {
    id: "billing",
    title: "Billing and reactivation",
    audience: "owner",
    keywords: ["billing", "lapsed", "locked", "read only", "reactivate", "expired", "subscription ended"],
    body:
      "When a trial or subscription ends, the account switches to read-only - your data is safe and nothing is deleted, but you cannot make changes until it is reactivated. Owners see a reactivation screen with a Contact us to activate button that emails support@reyguild.com.\n\nTechnicians on a lapsed account see a banner and read-only access until the owner reactivates.",
    references: [{ label: "Getting help", href: "#help" }],
  },
  {
    id: "gps",
    title: "GPS will not let me submit (technicians)",
    audience: "tech",
    keywords: ["gps", "location", "geofence", "too far", "cannot submit", "1 mile", "out of range"],
    body:
      "Material requests require you to be within 1 mile of the job site. If you see a location error or a 'too far' message: make sure you allowed location access in your browser, tap refresh to get a fresh reading, and confirm you are actually at the job. The dot turns green and shows your distance when you are in range.\n\nIf location is denied, enable it for the site in your phone's browser settings, then refresh.",
    references: [{ label: "Requesting materials", href: "#materials" }],
  },
  {
    id: "help",
    title: "Getting help and contacting support",
    audience: "all",
    keywords: ["help", "support", "contact", "question", "stuck", "email"],
    body:
      "Tap the Help button in the app to open this handbook and search it - type a few words like 'request materials' or 'receipt' to jump to the right section. If you still need a person, email support@reyguild.com and we will help.",
    references: [{ label: "Email support", href: "mailto:support@reyguild.com" }],
  },
];
