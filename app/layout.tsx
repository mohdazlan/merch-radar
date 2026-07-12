import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { DemoModeProvider } from "@/components/shared/DemoModeProvider";
import { SurfaceShell } from "@/components/shared/SurfaceShell";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Merch Radar",
    template: "%s · Merch Radar",
  },
  description:
    "Stop finding out too late, and stop buying dead stock. Merch Radar tells you what to launch this week. ApexSourcing tells you what's worth buying today.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <DemoModeProvider>
          <SurfaceShell>{children}</SurfaceShell>
        </DemoModeProvider>
      </body>
    </html>
  );
}
