import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Bookings · Finance · Ciergo",
  description: "All bookings across the agency, with approvals and ledger totals.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="bg-canvas font-sans antialiased">{children}</body>
    </html>
  );
}
