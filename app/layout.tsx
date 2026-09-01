import type { Metadata } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono } from "next/font/google";

import "@/styles/globals.css";

// BoardUI's type scale is set in Inter with the optical-size axis, so display
// sizes render in the display grade and body sizes in the text grade from one
// variable font. The variable names are what styles/typography.css expects.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  axes: ["opsz"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-source",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chat",
  description: "A streaming AI chat on your own model key, built with BoardUI.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans">
        {/* Applies the stored theme before first paint, so a dark-mode visitor
            never sees a light flash. The key matches the theme toggle. */}
        <Script id="boardui-theme" strategy="beforeInteractive">
          {`(function(){try{var dark=localStorage.getItem("boardui:theme")==="dark";document.documentElement.classList.toggle("dark",dark)}catch(e){document.documentElement.classList.remove("dark")}})();`}
        </Script>
        {children}
      </body>
    </html>
  );
}
