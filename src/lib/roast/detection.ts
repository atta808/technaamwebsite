import type { AdvisorProduct } from "../advisor/types";
import type { NormalizedTechnology, RoastFinding, StackInput } from "./types";
import { normalizeMonthlyCost } from "../advisor/scoring";

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function detectFindings(
  stack: StackInput,
  resolvedTechnologies: NormalizedTechnology[],
  unresolvedTechnologies: NormalizedTechnology[],
  catalog: AdvisorProduct[]
): RoastFinding[] {
  const findings: RoastFinding[] = [];

  const resolvedProducts = resolvedTechnologies
    .map(rt => catalog.find(p => p.id === rt.resolved_product_id))
    .filter((p): p is AdvisorProduct => p !== undefined);

  // A. Redundant responsibilities (e.g. Firebase + Supabase)
  const backendBaaS = resolvedProducts.filter(
    p => p.category === "Backend as a Service" || p.product_type === "baas"
  );
  if (backendBaaS.length > 1) {
    findings.push({
      id: generateId(),
      severity: "medium",
      category: "redundancy",
      title: "Overlapping Backend Responsibilities",
      description: `Multiple Backend-as-a-Service (BaaS) platforms detected (${backendBaaS.map(p => p.name).join(', ')}). This can lead to fragmented data and redundant infrastructure unless explicitly separated by microservices.`,
      affected_technologies: backendBaaS.map(p => p.name),
      evidence_basis: ["Multiple products with 'Backend as a Service' category or 'baas' type detected."],
      confidence: 0.8,
      actionable: true,
      suggested_fix: "Consolidate backend responsibilities into a single BaaS provider if possible.",
    });
  }

  // B. Duplicate hosting/deployment layers (e.g. Vercel + Netlify)
  const hostingProviders = resolvedProducts.filter(
    p => p.category === "Hosting" || p.product_type === "hosting" || p.category === "Platform as a Service"
  );
  if (hostingProviders.length > 1) {
    findings.push({
      id: generateId(),
      severity: "low",
      category: "redundancy",
      title: "Multiple Hosting Providers",
      description: `Multiple hosting or PaaS providers detected (${hostingProviders.map(p => p.name).join(', ')}). While possible for complex architectures, this often indicates unnecessary complexity for standard web projects.`,
      affected_technologies: hostingProviders.map(p => p.name),
      evidence_basis: ["Multiple products with 'Hosting' or 'Platform as a Service' category detected."],
      confidence: 0.7,
      actionable: true,
      suggested_fix: "Evaluate if all hosting providers are strictly necessary. Consolidate to a primary platform if appropriate.",
    });
  }

  // C. Duplicate databases
  const databases = resolvedProducts.filter(
    p => p.category === "Database" || p.product_type === "database"
  );
  if (databases.length > 1) {
     findings.push({
      id: generateId(),
      severity: "info",
      category: "complexity",
      title: "Multiple Databases Detected",
      description: `You are using multiple databases (${databases.map(p => p.name).join(', ')}). Ensure they serve distinct purposes (e.g., relational vs document) to justify the added operational complexity.`,
      affected_technologies: databases.map(p => p.name),
      evidence_basis: ["Multiple products with 'Database' category detected."],
      confidence: 0.6,
      actionable: false,
      suggested_fix: null,
    });
  }

  // D. Excessive infrastructure complexity
  if (resolvedProducts.length > 15) {
     findings.push({
      id: generateId(),
      severity: "low",
      category: "complexity",
      title: "High Stack Complexity",
      description: `This stack contains a large number of distinct tools and platforms (${resolvedProducts.length} resolved). This may increase onboarding time and maintenance overhead.`,
      affected_technologies: [],
      evidence_basis: [`Stack contains ${resolvedProducts.length} explicitly resolved technologies.`],
      confidence: 0.9,
      actionable: true,
      suggested_fix: "Review the stack for consolidation opportunities, particularly among overlapping tools.",
    });
  }

  // G. Privacy mismatch (Standard/High/Offline vs Cloud-only tools)
  if (stack.privacy_requirement === "offline" || stack.privacy_requirement === "high") {
    const cloudOnlyTools = resolvedProducts.filter(p => {
       // A tool is considered cloud-only if it's explicitly a SaaS/PaaS and lacks local/self-hosted features.
       // Here we approximate based on categories and missing local support features.
       const hasLocalSupport = p.features.some(f => f.slug.includes("local") || f.slug.includes("self-host") || f.slug.includes("offline"));
       const isCloudCategory = ["Hosting", "Backend as a Service", "Platform as a Service", "Serverless"].includes(p.category || "");

       return isCloudCategory && !hasLocalSupport;
    });

    if (cloudOnlyTools.length > 0) {
      findings.push({
        id: generateId(),
        severity: "high",
        category: "privacy",
        title: "Privacy Requirement Mismatch",
        description: `Your stated privacy requirement is '${stack.privacy_requirement}', but you are using tools typically deployed as cloud-only services (${cloudOnlyTools.map(p => p.name).join(', ')}).`,
        affected_technologies: cloudOnlyTools.map(p => p.name),
        evidence_basis: [`Privacy requirement is '${stack.privacy_requirement}'`, `Tools identified as cloud-dependent without clear self-hosting capabilities in catalog.`],
        confidence: 0.85,
        actionable: true,
        suggested_fix: "Replace cloud-only dependencies with self-hostable or offline-capable alternatives.",
      });
    }
  }

  // H. Budget risk
  let knownMonthlyCost = 0;

  for (const product of resolvedProducts) {
    if (product.pricing && product.pricing.length > 0) {
       // Estimate cost based on the cheapest paid plan or free plan if suitable
       const cost = normalizeMonthlyCost(product.pricing, stack.team_size);
       if (cost !== null) {
          knownMonthlyCost += cost;
       }
    }
  }

  if (stack.budget_monthly !== null && knownMonthlyCost > stack.budget_monthly) {
     findings.push({
      id: generateId(),
      severity: "high",
      category: "cost",
      title: "Budget Risk",
      description: `The known recurring costs for this stack ($${knownMonthlyCost.toFixed(2)}/mo) exceed your stated budget ($${stack.budget_monthly}/mo).`,
      affected_technologies: [],
      evidence_basis: [`Stated budget: $${stack.budget_monthly}/mo`, `Calculated minimum known costs: $${knownMonthlyCost.toFixed(2)}/mo.`],
      confidence: 0.9,
      actionable: true,
      suggested_fix: "Review pricing plans, downgrade tiers where possible, or replace paid tools with open-source alternatives.",
    });
  }

  // I. Unsupported/unknown technologies
  for (const unresolved of unresolvedTechnologies) {
     findings.push({
      id: generateId(),
      severity: "info",
      category: "unknown",
      title: `Unverified Technology: ${unresolved.original_name}`,
      description: `TechNaam could not verify '${unresolved.original_name}' or its compatibility with the rest of your stack.`,
      affected_technologies: [unresolved.original_name],
      evidence_basis: ["Technology not found in TechNaam intelligence catalog."],
      confidence: 1.0,
      actionable: false,
      suggested_fix: null,
    });
  }

  return findings;
}
