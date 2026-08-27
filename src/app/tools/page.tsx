import type { Metadata } from "next";
import ToolsCatalog from "@/components/tools/ToolsCatalog";
import { getPublishedTools } from "@/lib/queries/products";

export const metadata: Metadata = {
  title: "Technology Intelligence Tools | TechNaam",
  description:
    "Explore verified AI coding tools, local AI runtimes, and development platforms.",
};

export default async function ToolsPage() {
  // TEMPORARY DIAGNOSTIC — remove after Vercel runtime environment check.
  const hasSupabaseUrl = Boolean(process.env.SUPABASE_URL);
  const hasSupabaseAnonKey = Boolean(process.env.SUPABASE_ANON_KEY);

  if (!hasSupabaseUrl || !hasSupabaseAnonKey) {
    return (
      <main className="min-h-screen bg-slate-50 pt-32 pb-20">
        <pre>
          {`SUPABASE_URL: ${hasSupabaseUrl ? "PRESENT" : "MISSING"}\nSUPABASE_ANON_KEY: ${hasSupabaseAnonKey ? "PRESENT" : "MISSING"}`}
        </pre>
      </main>
    );
  }

  const products = await getPublishedTools();

  return (
    <main className="min-h-screen bg-slate-50 pt-32 pb-20">
      <div className="mx-auto max-w-7xl px-6">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Technology Intelligence Tools
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Verified product intelligence for AI coding tools, local AI runtimes, and
            developer platforms.
          </p>
        </header>

        <ToolsCatalog products={products} />
      </div>
    </main>
  );
}
