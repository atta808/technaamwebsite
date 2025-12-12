import { QrCode, Shield, Calendar, CheckCircle } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Products | CardSphere & LegalSphere",
  description:
    "Explore our suite of digital tools: CardSphere digital visiting cards and LegalSphereDiary for advocates.",
};

export default function ProductsPage() {
  return (
    <main className="pt-32 pb-20 bg-slate-50 min-h-screen">
      {/* 1. Header */}
      <div className="max-w-7xl mx-auto px-6 text-center mb-24 animate-fade-up">
        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
          Tools that define{" "}
          <span className="text-[#0B66FF]">Modern Efficiency.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-slate-600">
          From digital networking to courtroom management. Our ecosystem is
          built to automate the boring stuff so you can focus on the work that
          matters.
        </p>
      </div>

      {/* PRODUCT 1: CardSphere */}
      <section className="max-w-7xl mx-auto px-6 mb-32">
        <div className="bg-white rounded-[2.5rem] p-8 md:p-16 shadow-xl border border-slate-100 overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center space-x-2 text-[#0B66FF] font-bold mb-6 bg-blue-50 px-4 py-2 rounded-full w-fit">
                <QrCode size={20} />
                <span>CardSphere App</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
                Your Identity. <br />
                Digital & Limitless.
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Stop wasting money on paper cards that get thrown away.
                CardSphere allows you to create a premium digital profile that
                lives on the web. Share instantly via NFC, QR Code, or Link.
              </p>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-slate-700 font-medium">
                  <CheckCircle className="text-green-500" /> Save Contact to
                  Phone in 1 Click
                </li>
                <li className="flex items-center gap-3 text-slate-700 font-medium">
                  <CheckCircle className="text-green-500" /> Update details
                  anytime (Real-time)
                </li>
                <li className="flex items-center gap-3 text-slate-700 font-medium">
                  <CheckCircle className="text-green-500" /> QR Code Widget
                  included
                </li>
              </ul>

              <div className="flex gap-4">
                <button className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition">
                  Get for Android
                </button>
                <Link
                  href="/contact"
                  className="px-8 py-3 rounded-xl font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 transition"
                >
                  Request Demo
                </Link>
              </div>
            </div>

            {/* Image Placeholder */}
            <div className="order-1 lg:order-2 relative">
              {/* Decorative Blob */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-100 rounded-full blur-3xl opacity-50 -z-10"></div>

              {/* The "Phone" Mockup */}
              <div className="mx-auto w-[280px] h-[580px] bg-slate-900 rounded-[3rem] border-8 border-slate-800 shadow-2xl overflow-hidden relative flex items-center justify-center">
                {/* Screen Content */}
                <div className="w-full h-full bg-white flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-24 h-24 bg-gray-200 rounded-full mb-4 animate-pulse"></div>
                  <div className="h-4 w-32 bg-gray-200 rounded mb-2 animate-pulse"></div>
                  <div className="h-3 w-48 bg-gray-100 rounded mb-8 animate-pulse"></div>
                  <div className="w-full h-12 bg-[#0B66FF] rounded-lg mb-2 opacity-20"></div>
                  <p className="text-xs text-gray-400 mt-8">
                    App Screenshot Here
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT 2: LegalSphere Diary */}
      <section className="max-w-7xl mx-auto px-6 mb-32">
        <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-16 shadow-2xl overflow-hidden text-white relative">
          {/* Background Grid */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          ></div>

          <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
            {/* Image Placeholder (Left side this time) */}
            <div className="order-1 relative">
              <div className="w-full aspect-video bg-slate-800 rounded-xl border border-slate-700 shadow-2xl flex items-center justify-center group hover:scale-105 transition-transform duration-500">
                <div className="text-center">
                  <Calendar size={48} className="mx-auto text-slate-600 mb-4" />
                  <p className="text-slate-500 font-mono text-sm">
                    Dashboard UI Screenshot
                  </p>
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div className="order-2">
              <div className="inline-flex items-center space-x-2 text-[#0B66FF] font-bold mb-6 bg-slate-800 px-4 py-2 rounded-full w-fit border border-slate-700">
                <Shield size={20} />
                <span>LegalSphere Diary</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                The Advocate&apos;s <br />
                Digital Brain.
              </h2>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                Managing manual diaries is risky. Dates get missed, books get
                lost. LegalSphere is a cloud-secure system to track Court Dates,
                Client Payments, and Case History.
              </p>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-slate-300 font-medium">
                  <CheckCircle className="text-[#0B66FF]" /> Auto-SMS reminders
                  for Clients
                </li>
                <li className="flex items-center gap-3 text-slate-300 font-medium">
                  <CheckCircle className="text-[#0B66FF]" /> Search cases by
                  Party Name
                </li>
                <li className="flex items-center gap-3 text-slate-300 font-medium">
                  <CheckCircle className="text-[#0B66FF]" /> Secure Cloud Backup
                </li>
              </ul>

              <button className="bg-[#0B66FF] text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-600 transition shadow-lg shadow-blue-500/20">
                Request Access
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-20">
        <h2 className="text-3xl font-bold text-slate-900 mb-6">
          Need a Custom Tool?
        </h2>
        <p className="text-slate-600 mb-8 max-w-xl mx-auto">
          We also build custom Case File Builders and Automation scripts for
          specific law firm needs.
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center font-bold text-[#0B66FF] hover:underline"
        >
          Discuss Custom Development →
        </Link>
      </section>
    </main>
  );
}
