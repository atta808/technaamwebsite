"use client";

import { Code2, Smartphone, Scale, Bot, Database, PenTool } from "lucide-react";

const services = [
  {
    title: "Web Development",
    desc: "High-performance SaaS platforms built with Next.js 14 and Tailwind CSS. We build websites that feel like mobile apps.",
    icon: <Code2 className="w-6 h-6 text-white" />,
    color: "bg-blue-500",
  },
  {
    title: "Mobile App Dev",
    desc: "Native iOS and Android applications using React Native. One codebase, two platforms, world-class performance.",
    icon: <Smartphone className="w-6 h-6 text-white" />,
    color: "bg-indigo-500",
  },
  {
    title: "Legal-Tech Solutions",
    desc: "Custom Case Management Systems (CMS) for Pakistani Advocates. Automate case dates, client records, and legal drafting.",
    icon: <Scale className="w-6 h-6 text-white" />,
    color: "bg-slate-700",
  },
  {
    title: "AI & Automation",
    desc: "Integrate ChatGPT/OpenAI into your business. Automate email replies, document summarization, and customer support.",
    icon: <Bot className="w-6 h-6 text-white" />,
    color: "bg-emerald-500",
  },
  {
    title: "Database Architecture",
    desc: "Secure, scalable backend systems using PostgreSQL and Supabase. We protect your data with bank-grade security.",
    icon: <Database className="w-6 h-6 text-white" />,
    color: "bg-cyan-500",
  },
  {
    title: "UI/UX Design",
    desc: "Modern, clean, and accessible design systems. We design interfaces that users love to touch and interact with.",
    icon: <PenTool className="w-6 h-6 text-white" />,
    color: "bg-pink-500",
  },
];

export default function ServicesList() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((item, idx) => (
            <div
              key={idx}
              className="group p-8 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div
                className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform`}
              >
                {item.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                {item.title}
              </h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
