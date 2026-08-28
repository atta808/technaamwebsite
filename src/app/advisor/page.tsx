import type { Metadata } from "next";
import AdvisorForm from "@/components/advisor/AdvisorForm";

export const metadata: Metadata = {
  title: "TechNaam Stack Advisor — Find the Right Technology Stack",
  description:
    "Build a technology stack matched to your project, team, budget, and technical requirements.",
};

export default function AdvisorPage() {
  return (
    <main className="min-h-screen bg-slate-50 pt-32 pb-20">
      <div className="mx-auto max-w-4xl px-6">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            TechNaam Stack Advisor
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Find a technology stack matched to your project, team, budget, and
            technical requirements.
          </p>
        </header>

        <AdvisorForm />
      </div>
    </main>
  );
}
