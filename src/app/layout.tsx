import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "TechNaam | Legal Tech & SaaS Development",
  description:
    "Premium software development by Atta Ur Rehman Dhothar. Specializing in Next.js, Legal Tech, and AI Automation.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const host = (await headers()).get("host")?.split(":")[0].toLowerCase();
  const isClerkSubdomain = host === "clerk.technaam.com";

  return (
    <html lang="en" className={inter.variable}>
      <body
        className={
          isClerkSubdomain
            ? "min-h-screen bg-slate-950"
            : "flex min-h-screen flex-col bg-slate-50"
        }
      >
        {isClerkSubdomain ? (
          children
        ) : (
          <>
            <Navbar />
            <main className="flex-grow">{children}</main>
            <Footer />
          </>
        )}
      </body>
    </html>
  );
}
