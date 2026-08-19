import type { Metadata } from "next";
import "./globals.css";

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
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" />
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('reyguild-theme');if(t){document.documentElement.dataset.theme=t}}catch(e){}" }} />
        {children}
      </body>
    </html>
  );
}
