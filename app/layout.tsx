import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReyGuild — Service Company Software",
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
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('reyguild-theme');if(t){document.documentElement.dataset.theme=t}}catch(e){}" }} />
        {children}
      </body>
    </html>
  );
}
