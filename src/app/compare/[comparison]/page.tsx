import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ComparisonView from "@/components/comparisons/ComparisonView";
import { getComparison } from "@/lib/queries/comparisons";

type ComparisonPageProps = {
  params: Promise<{ comparison: string }>;
};

function humanizeSlug(slug: string) {
  return slug.replaceAll("-", " ").replaceAll("_", " ");
}

export async function generateMetadata({
  params,
}: ComparisonPageProps): Promise<Metadata> {
  const { comparison } = await params;
  const result = await getComparison(comparison);

  const productA = result.products[0];
  const productB = result.products[1];

  const title =
    productA && productB
      ? `${productA.name} vs ${productB.name} — TechNaam`
      : `${humanizeSlug(result.leftSlug || comparison)} vs ${humanizeSlug(
          result.rightSlug || ""
        )} — TechNaam`.trim();

  return {
    metadataBase: new URL("https://technaam.com"),
    title,
    description:
      productA && productB
        ? `Compare ${productA.name} and ${productB.name} using verified TechNaam product intelligence.`
        : "TechNaam product comparison.",
    alternates: {
      canonical: `/compare/${comparison}`,
    },
    openGraph: {
      title,
      description:
        productA && productB
          ? `Compare ${productA.name} and ${productB.name} using verified TechNaam product intelligence.`
          : "TechNaam product comparison.",
      type: "website",
      url: `https://technaam.com/compare/${comparison}`,
    },
  };
}

export default async function ComparisonPage({ params }: ComparisonPageProps) {
  const { comparison } = await params;
  const result = await getComparison(comparison);

  if (result.status === "invalid") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 pt-32 pb-20">
      <div className="mx-auto max-w-6xl px-6">
        <ComparisonView comparison={result} />
      </div>
    </main>
  );
}
