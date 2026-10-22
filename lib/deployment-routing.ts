export function shouldRedirectDeployment(host: string, pathname: string, environment?: string): boolean {
  // Company tests must execute the preview's code rather than opening production.
  if (environment === "preview") return false;
  if (pathname.startsWith("/api/cron/")) return false;
  return host.endsWith(".vercel.app");
}
