"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton({ className }: { className?: string } = {}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className={className || "w-full text-left text-sm text-slate-300 hover:text-white"}
    >
      Sign out
    </button>
  );
}