import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { PagesProvider } from "@/context/PagesContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yestion",
  description: "A personal Notion-like workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} h-full antialiased`}>
      <body className="h-full flex overflow-hidden bg-white text-gray-900">
        <PagesProvider>
          <Sidebar />
          <main className="flex-1 h-full overflow-y-auto">{children}</main>
        </PagesProvider>
      </body>
    </html>
  );
}
