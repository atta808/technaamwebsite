import type { Metadata } from "next";
import { headers } from "next/headers";
import ClerkDownload from "@/components/ClerkDownload";
import Hero from "@/components/sections/Hero";
import ProductGrid from "@/components/sections/ProductGrid";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host")?.split(":")[0].toLowerCase();

  if (host === "clerk.technaam.com") {
    return {
      title: "TechNaam Clerk App | Official Download",
      description:
        "Official TechNaam Clerk mobile app download page for Android.",
    };
  }

  return {
    title: "TechNaam | Legal Tech & SaaS Development",
    description:
      "Premium software development by Atta Ur Rehman Dhothar. Specializing in Next.js, Legal Tech, and AI Automation.",
  };
}

export default async function Home() {
  const host = (await headers()).get("host")?.split(":")[0].toLowerCase();

  if (host === "clerk.technaam.com") {
    return <ClerkDownload />;
  }

  return (
    <>
      <Hero />
      <ProductGrid />
      {/* Next: We will add Services & Testimonials here */}
    </>
  );
}
