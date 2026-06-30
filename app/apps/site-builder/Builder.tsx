"use client";

import dynamic from "next/dynamic";

const SiteBuilder = dynamic(() => import("./ServiceSiteBuilder"), {
  ssr: false,
  loading: () => (
    <div className="p-10 text-center text-slate-400">Loading the builder…</div>
  ),
});

export default function Builder() {
  return <SiteBuilder />;
}
