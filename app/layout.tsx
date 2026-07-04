import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import ThemeProvider from "./components/ThemeProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Le Scribe",
  description: "Transforme tes prédications en livre publié",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${playfair.variable} ${inter.variable}`}>
      <head>
        <style>{`button,a,[role="button"]{cursor:pointer!important}`}</style>
        {/* Anti-flash : applique le bon thème avant le premier rendu */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme')||'system';var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='light'||(t==='system'&&!d)){document.documentElement.classList.add('light');}}catch(e){}})();` }} />
      </head>
      <body suppressHydrationWarning style={{ fontFamily: "var(--font-inter, system-ui, sans-serif)" }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <footer style={{ textAlign: 'center', padding: '1rem', fontSize: '0.75rem', opacity: 0.5 }}>
          © Nicolas Salafranque — Le Scribe
        </footer>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
