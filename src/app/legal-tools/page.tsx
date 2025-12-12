import { FileText, PenTool, Hammer, Download, Lock } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal Tools | DraftDesk & Automation",
  description:
    "Automated legal drafting tools for Pakistani Advocates. Create Rent Agreements, Affidavits, and Case Files instantly.",
};

export default function LegalToolsPage() {
  const tools = [
    {
      title: "Rent Agreement Wizard",
      desc: "Create a standard Punjab/Islamabad rent agreement in Urdu or English. Just fill in the names, and get a printable PDF.",
      icon: <FileText size={24} />,
      status: "Live",
    },
    {
      title: "Affidavit Generator",
      desc: "Generate professional affidavits for court submissions. Compliant with High Court Rules & Orders.",
      icon: <PenTool size={24} />,
      status: "Live",
    },
    {
      title: "Case File Builder",
      desc: "The complete 'One PDF System'. Organize your Plaint, Vakalatnama, and Evidence into a single indexed PDF.",
      icon: <Hammer size={24} />,
      status: "Beta",
    },
    {
      title: "Legal Notice Automator",
      desc: "Draft professional legal notices for recovery, defamation, or breach of contract in minutes.",
      icon: <Lock size={24} />,
      status: "Coming Soon",
    },
  ];

  return (
    <main className="pt-32 pb-20 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 text-center mb-16 animate-fade-up">
        <div className="inline-flex items-center space-x-2 bg-blue-50 text-[#0B66FF] px-4 py-1.5 rounded-full text-sm font-bold mb-6 border border-blue-100">
          <span>Powered by DraftDesk</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
          Automate the <span className="text-[#0B66FF]">Paperwork.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-slate-600">
          Why type the same drafts over and over? Use our smart templates to
          generate error-free legal documents in seconds.
        </p>
      </div>

      {/* Tools Grid */}
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-8 mb-20">
        {tools.map((tool, idx) => (
          <div
            key={idx}
            className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-[#0B66FF]/30 transition-all duration-300 group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700 group-hover:bg-[#0B66FF] group-hover:text-white transition-colors">
                {tool.icon}
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  tool.status === "Live"
                    ? "bg-green-100 text-green-700"
                    : tool.status === "Beta"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {tool.status}
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {tool.title}
            </h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              {tool.desc}
            </p>

            <button className="w-full py-3 rounded-lg border border-slate-200 font-bold text-slate-700 hover:bg-[#0B66FF] hover:text-white hover:border-transparent transition-all flex items-center justify-center gap-2">
              <Download size={18} /> Access Tool
            </button>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-slate-900 py-16 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-white mb-4">
            Are you a Developer?
          </h2>
          <p className="text-slate-400 mb-8">
            We provide APIs for legal automation. Integrate DraftDesk logic into
            your own ERP or CRM.
          </p>
          <Link
            href="/contact"
            className="text-white underline font-bold hover:text-[#0B66FF]"
          >
            Contact for API Access
          </Link>
        </div>
      </div>
    </main>
  );
}
