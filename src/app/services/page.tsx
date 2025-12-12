import ServicesList from "@/components/sections/ServicesList";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services | TechNaam Development",
  description:
    "Web development, App development, and Legal Tech services by Atta Ur Rehman Dhothar.",
};

export default function ServicesPage() {
  return (
    <main className="pt-32 min-h-screen bg-slate-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
          Engineering Your{" "}
          <span className="text-[#0B66FF]">Digital Future</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-slate-600">
          We don&apos;t just write code; we build business assets. From simple
          websites to complex AI-powered legal systems.
        </p>
      </div>

      {/* The List Grid */}
      <ServicesList />

      {/* CTA Section */}
      <div className="bg-[#0B66FF] py-20 mt-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to start your project?
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            Whether you need a Lawyer&apos;s Diary app or a corporate website,
            we are ready to build.
          </p>
          <a
            href="/contact"
            className="inline-block bg-white text-[#0B66FF] px-8 py-4 rounded-full font-bold shadow-xl hover:bg-gray-50 transition-all transform hover:-translate-y-1"
          >
            Get a Free Quote
          </a>
        </div>
      </div>
    </main>
  );
}
