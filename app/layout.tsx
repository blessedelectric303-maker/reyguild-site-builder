import type { Metadata } from "next";
import "./globals.css";
import "./reyguild-brand.css";
import Splash from "@/components/Splash";

export const metadata: Metadata = {
  title: "ReyGuild - Service Company Software",
  description: "One login. Every ReyGuild app in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@400;500;600;700&display=swap" />
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('reyguild-theme');if(t){document.documentElement.dataset.theme=t}}catch(e){}try{if(sessionStorage.getItem('rg_splash_seen')){document.documentElement.dataset.splash='seen'}}catch(e){}" }} />
        {/* Hides the splash BEFORE the browser paints, on every visit after
            the first one this session. Plain CSS keyed off an attribute the
            script above sets, so it needs no JavaScript to run and cannot be
            late - which is what caused the page to flash into view ahead of
            the animation. */}
        <style dangerouslySetInnerHTML={{ __html: "html[data-splash='seen'] .rg-splash{display:none!important}" }} />
        {/* The opening screen. In the ROOT layout, so it covers the command
            centre, the tech phone view and Proposals & Invoicing alike -
            wherever somebody lands first. */}
        <Splash />
        {children}
      </body>
    </html>
  );
}
