"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";

type NavItem = {
  href: string;
  label: string;
  badgeCount?: number;
};

export default function AdminShell({
  user,
  navItems,
  pendingTimeOffCount,
  children,
}: {
  user: { name: string; email: string; role: string };
  navItems: NavItem[];
  pendingTimeOffCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Find current page label for the mobile top bar
  const currentLabel =
    [...navItems]
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
      ?.label || "";

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const totalBadges = navItems.reduce(
    (sum, item) => sum + (item.badgeCount || 0),
    0
  );

  function NavLinks({ onClick }: { onClick?: () => void }) {
    return (
      <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={
              "flex items-center justify-between px-3 py-2 rounded-lg " +
              (isActive(item.href)
                ? "bg-slate-800 text-white"
                : "hover:bg-slate-800")
            }>
            <span>{item.label}</span>
            {item.badgeCount && item.badgeCount > 0 ? (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-red-600 text-white">
                {item.badgeCount}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>
    );
  }

  function SidebarContent() {
    return (
      <>
        <div className="px-6 py-5 border-b border-slate-800">
          <Logo dark size={40} />
          <div className="text-xs text-slate-400 mt-2 capitalize">
            {user.role} portal
          </div>
        </div>
        <NavLinks onClick={() => setDrawerOpen(false)} />
        {/* LEAVING THE APP, at the foot of the menu. Back to the command
            centre, across to the other app, then sign out - the same three in
            the same order as Proposals and Invoicing, so somebody switching
            between them is not hunting for a button that moved.
            Command centre used to sit at the TOP, above the navigation, which
            put "leave" where your eye lands first. */}
        <div className="border-t border-slate-800 p-4 space-y-2">
          <a href="/" className="block rounded-md px-3 py-2 text-center text-xs font-bold"
             style={{ background: "#16243F", color: "#CC9000", border: "1px solid #CC9000" }}>
            &larr; Back to command center
          </a>
          <a href="/apps/estimating" className="block rounded-md px-3 py-2 text-center text-xs font-bold"
             style={{ background: "#CC9000", color: "#16243F" }}>
            Switch to Proposals &amp; Invoicing
          </a>
          <LogoutButton className="block w-full rounded-md border border-red-400 bg-white px-3 py-2 text-center text-xs font-bold text-red-600" />
        </div>

        <div className="border-t border-slate-800 p-4">
          <div className="text-sm font-medium truncate">{user.name}</div>
          <div className="text-xs text-slate-400 truncate">{user.email}</div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar - hidden on mobile */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-100 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile top bar - hidden on desktop */}
      <header className="md:hidden bg-slate-900 text-slate-100 flex items-center justify-between px-4 py-3 sticky top-0 z-30">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="relative p-2 -ml-2 rounded hover:bg-slate-800">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
          {totalBadges > 0 && (
            <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold rounded-full bg-red-600 text-white">
              {totalBadges}
            </span>
          )}
        </button>
        <div className="font-semibold text-sm truncate flex-1 text-center px-2">
          {currentLabel || "ReyGuild"}
        </div>
        {/* Spacer to balance the menu button */}
        <div className="w-10" />
      </header>

      {/* Mobile drawer + backdrop */}
      {drawerOpen && (
        <>
          <div
            onClick={() => setDrawerOpen(false)}
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            aria-hidden="true"/>
          <aside className="md:hidden fixed top-0 left-0 bottom-0 w-72 max-w-[85%] bg-slate-900 text-slate-100 flex flex-col z-50 shadow-xl">
            <div className="flex justify-end px-2 pt-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="p-2 rounded hover:bg-slate-800">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <SidebarContent />
          </aside>
        </>
      )}

      <main className="flex-1 bg-slate-50 overflow-auto flex flex-col">
        <div className="px-4 md:px-8 py-4 md:py-6 max-w-7xl mx-auto w-full flex-1">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}
