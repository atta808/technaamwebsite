import GoogleMapSection from "@/components/maps/GoogleMapSection";
import { Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact TechNaam | Legal Tech & Development",
  description:
    "Get in touch with Atta Ur Rehman Dhothar for web development and legal tech solutions.",
};

export default function ContactPage() {
  return (
    <main className="bg-slate-50 min-h-screen pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-16 animate-fade-up">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl mb-4">
            Let's Build Something{" "}
            <span className="text-[#0B66FF]">Extraordinary</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Whether it is a legal-tech tool, a custom app, or an automation
            inquiry. TechNaam is ready to engineer your solution.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Column: Contact Form */}
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100 animate-fade-up [animation-delay:200ms]">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">
              Send a Message
            </h2>
            <form className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0B66FF] focus:border-transparent outline-none transition"
                    placeholder="Ali Khan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0B66FF] focus:border-transparent outline-none transition"
                    placeholder="+92 300..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0B66FF] focus:border-transparent outline-none transition"
                  placeholder="ali@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Project Type
                </label>
                <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0B66FF] outline-none">
                  <option>Web Development</option>
                  <option>Legal Tech / Automation</option>
                  <option>CardSphere Support</option>
                  <option>Consultation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Message
                </label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0B66FF] focus:border-transparent outline-none transition"
                  placeholder="Tell us about your project..."
                ></textarea>
              </div>

              <button className="w-full bg-[#0B66FF] text-white font-bold py-4 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform hover:-translate-y-1">
                Send Message
              </button>
            </form>
          </div>

          {/* Right Column: Info & Map */}
          <div className="space-y-8 animate-fade-up [animation-delay:400ms]">
            {/* Contact Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-[#0B66FF] shrink-0">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Email Us</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    support@technaam.com
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-[#0B66FF] shrink-0">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Visit HQ</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Mandi Bahauddin, PK
                  </p>
                </div>
              </div>
            </div>

            {/* Map Container */}
            <div className="relative">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <MapPin size={20} className="text-[#0B66FF]" />
                Our Location
              </h3>
              <GoogleMapSection />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
