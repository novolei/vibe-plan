import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vibe Plan",
  description: "Stage-centric NPI build planning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full overflow-x-hidden antialiased">
        <body className="flex min-h-full flex-col overflow-x-hidden">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
