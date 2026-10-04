import { headers } from "next/headers";
import ClerkDownload from "@/components/ClerkDownload";
import Hero from "@/components/sections/Hero";
import ProductGrid from "@/components/sections/ProductGrid";

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
