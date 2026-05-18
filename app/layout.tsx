import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

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
      </head>
      <body suppressHydrationWarning style={{ fontFamily: "var(--font-inter, system-ui, sans-serif)" }}>
        {children}
      </body>
    </html>
  );
}
