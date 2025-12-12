"use client";

import Link from "next/link";
import { ArrowRight, Globe, Shield, FileText } from "lucide-react";

const products = [
  {
    title: "CardSphere",
    badge: "Digital Identity",
    description:
      "The next-generation digital visiting card. Share your professional profile instantly via QR or NFC tech.",
    icon: <Globe className="w-8 h-8 text-white" />,
    gradient: "from-blue-500 to-cyan-400",
    link: "/products",
  },
  {
    title: "LegalSphereDiary",
    badge: "Legal Tech",
    description:
      "A secure digital diary for Advocates. Manage case dates, client history, and court proceedings in one secured cloud.",
    icon: <Shield className="w-8 h-8 text-white" />,
    gradient: "from-indigo-500 to-purple-500",
    link: "/products",
  },
  {
    title: "Case File Builder",
    badge: "Automation",
    description:
      "Stop drafting from scratch. Generate complete legal case files (Plaints, Petitions) in PDF format with one click.",
    icon: <FileText className="w-8 h-8 text-white" />,
    gradient: "from-emerald-500 to-teal-400",
    link: "/products",
  },
];

export default function ProductGrid() {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Our <span className="text-[#0B66FF]">Digital Ecosystem</span>
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg">
            Tools designed for precision, security, and speed. Built for the
            modern professional in Pakistan.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {products.map((item, idx) => (
            <div
              key={idx}
              className="group relative p-8 rounded-3xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500 overflow-hidden"
            >
              {/* Hover Gradient Border Effect */}
              <div
                className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${item.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}
              ></div>

              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300`}
              >
                {item.icon}
              </div>

              <div className="inline-block px-3 py-1 rounded-full bg-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider mb-4">
                {item.badge}
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-[#0B66FF] transition-colors">
                {item.title}
              </h3>

              <p className="text-slate-500 leading-relaxed mb-6">
                {item.description}
              </p>

              <Link
                href={item.link}
                className="inline-flex items-center font-bold text-sm text-slate-700 hover:text-[#0B66FF] transition-colors"
              >
                Learn more{" "}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
