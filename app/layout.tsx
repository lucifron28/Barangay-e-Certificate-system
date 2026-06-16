import type { Metadata } from "next";
import { ThemeInitializer } from "@/components/theme/theme-initializer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Barangay Bato e-Certificate System",
  description:
    "Online barangay certificate request and management system for Barangay Bato, Mauban, Quezon.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="barangay-bato" suppressHydrationWarning>
      <body className="bg-base-200 text-base-content antialiased">
        <ThemeInitializer />
        {children}
      </body>
    </html>
  );
}
