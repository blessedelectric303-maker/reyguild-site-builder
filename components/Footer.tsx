export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <span>© {new Date().getFullYear()} ReyGuild LLC. All rights reserved.</span>
        <nav className="flex items-center gap-4">
          <a href="https://app.termly.io/policy-viewer/policy.html?policyUUID=1bdc8f85-4a2e-4e4a-90ab-bfbb39baedc4" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 hover:underline">
            Terms of Service
          </a>
          <a href="https://app.termly.io/policy-viewer/policy.html?policyUUID=33a72367-0b5a-48cc-aeba-f90902af8661" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 hover:underline">
            Privacy Policy
          </a>
          <a href="https://app.termly.io/policy-viewer/policy.html?policyUUID=821a1862-53f9-4245-874d-ba20f1477653" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 hover:underline">
            Cookie Policy
          </a>
        </nav>
      </div>
    </footer>
  );
}
