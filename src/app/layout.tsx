import type { Metadata } from "next";
import { Caveat, Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const hand = Caveat({ subsets: ["latin"], variable: "--font-hand" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const body = Source_Sans_3({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "rj pin feed · scrapbook",
  description: "A nostalgic scrapbook of my Pinterest home feed.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${hand.variable} ${display.variable} ${body.variable}`}>
        {children}
      </body>
    </html>
  );
}
