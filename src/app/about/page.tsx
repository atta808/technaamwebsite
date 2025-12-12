import { Terminal, Gavel, Cpu, BookOpen, Award, Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Atta Ur Rehman | The Lawyer Who Codes",
  description:
    "Advocate High Court and Full-Stack Developer. Founder of TechNaam, DraftDesk, and LawOrbits.",
};

export default function AboutPage() {
  return (
    <main className="pt-32 pb-20 bg-slate-50 min-h-screen">
      {/* 1. Hero Section */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-20 animate-fade-up">
        <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600 mb-6 shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-[#0B66FF] mr-2"></span>
          Based in Mandi Bahauddin, Pakistan
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
          Redefining Justice through <br />
          <span className="text-[#0B66FF]">Digital Innovation.</span>
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          I am <strong>Atta Ur Rehman Dhothar</strong>. <br />
          Advocate High Court by profession. Full-Stack Engineer by passion.
        </p>
      </div>

      {/* 2. The Dual Identity Grid */}
      <div className="max-w-6xl mx-auto px-6 mb-24">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: The Lawyer */}
          <div className="bg-white p-10 rounded-3xl shadow-xl border-l-4 border-slate-800 animate-fade-up [animation-delay:200ms]">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 text-slate-800">
              <Gavel size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              The Legal Expert
            </h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              As an Advocate of the High Court, I understand the complexities of
              the Pakistani legal system. My experience in Civil and Criminal
              law drives my mission to simplify legal processes for everyone.
            </p>
            <ul className="space-y-3">
              <li className="flex items-center text-sm font-medium text-slate-700">
                <Award className="w-4 h-4 mr-2 text-slate-400" /> Advocate High
                Court
              </li>
              <li className="flex items-center text-sm font-medium text-slate-700">
                <BookOpen className="w-4 h-4 mr-2 text-slate-400" /> DraftDesk
                Founder
              </li>
              <li className="flex items-center text-sm font-medium text-slate-700">
                <Users className="w-4 h-4 mr-2 text-slate-400" /> Legal
                Consultancy
              </li>
            </ul>
          </div>

          {/* Right: The Developer */}
          <div className="bg-white p-10 rounded-3xl shadow-xl border-l-4 border-[#0B66FF] animate-fade-up [animation-delay:400ms]">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-[#0B66FF]">
              <Terminal size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              The Tech Architect
            </h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              I don&apos;t just practice law; I code the future of it.
              Specializing in Next.js, AI, and Automation, I build SaaS products
              that modernize how businesses and law firms operate.
            </p>
            <ul className="space-y-3">
              <li className="flex items-center text-sm font-medium text-slate-700">
                <Cpu className="w-4 h-4 mr-2 text-[#0B66FF]" /> Full-Stack
                Development
              </li>
              <li className="flex items-center text-sm font-medium text-slate-700">
                <Terminal className="w-4 h-4 mr-2 text-[#0B66FF]" /> AI &
                Automation
              </li>
              <li className="flex items-center text-sm font-medium text-slate-700">
                <Users className="w-4 h-4 mr-2 text-[#0B66FF]" /> TechNaam
                Founder
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3. The Mission / Story */}
      <div className="bg-slate-900 text-white py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-8">Why I Started TechNaam?</h2>
          <p className="text-lg text-slate-300 leading-relaxed mb-8">
            "I realized that the legal industry was stuck in the past. Piles of
            paper, manual typing, and slow processes were the norm. I taught
            myself to code with one goal:
            <span className="text-[#0B66FF] font-bold">
              {" "}
              To build the digital bridge.
            </span>
            "
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12 border-t border-slate-800 pt-12">
            <div>
              <div className="text-4xl font-bold text-[#0B66FF] mb-2">3+</div>
              <div className="text-sm text-slate-400">Major Brands</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#0B66FF] mb-2">5+</div>
              <div className="text-sm text-slate-400">Years Experience</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#0B66FF] mb-2">100+</div>
              <div className="text-sm text-slate-400">Projects Done</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#0B66FF] mb-2">24/7</div>
              <div className="text-sm text-slate-400">Support</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
