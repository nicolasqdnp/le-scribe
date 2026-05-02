import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
