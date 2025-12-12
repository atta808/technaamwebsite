"use client";

import Link from "next/link";
import { Github, Linkedin, Twitter, Facebook, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* Column 1: Brand & Mission */}
        <div>
          <Link
            href="/"
            className="text-2xl font-bold tracking-tighter text-white"
          >
            Tech<span className="text-[#0B66FF]">Naam</span>.
          </Link>
          <p className="mt-4 text-slate-400 text-sm leading-relaxed">
            Bridging the gap between Law and Logic. We build premium digital
            assets for the legal industry and global enterprises.
          </p>
          <div className="flex space-x-4 mt-6">
            <a href="#" className="hover:text-white transition-colors">
              <Linkedin size={20} />
            </a>
            <a href="#" className="hover:text-white transition-colors">
              <Twitter size={20} />
            </a>
            <a href="#" className="hover:text-white transition-colors">
              <Github size={20} />
            </a>
            <a href="#" className="hover:text-white transition-colors">
              <Facebook size={20} />
            </a>
          </div>
        </div>

        {/* Column 2: Products */}
        <div>
          <h3 className="text-white font-bold mb-6">Products</h3>
          <ul className="space-y-4 text-sm">
            <li>
              <Link
                href="/products"
                className="hover:text-[#0B66FF] transition-colors"
              >
                CardSphere App
              </Link>
            </li>
            <li>
              <Link
                href="/products"
                className="hover:text-[#0B66FF] transition-colors"
              >
                LegalSphere Diary
              </Link>
            </li>
            <li>
              <Link
                href="/products"
                className="hover:text-[#0B66FF] transition-colors"
              >
                Case File Builder
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Legal & Support (UPDATED) */}
        <div>
          <h3 className="text-white font-bold mb-6">Legal Center</h3>
          <ul className="space-y-4 text-sm">
            <li>
              <Link
                href="/privacy"
                className="hover:text-[#0B66FF] transition-colors"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="hover:text-[#0B66FF] transition-colors"
              >
                Support & Help
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="hover:text-[#0B66FF] transition-colors"
              >
                About Developer
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 4: Contact */}
        <div>
          <h3 className="text-white font-bold mb-6">Contact</h3>
          <ul className="space-y-4 text-sm">
            <li className="flex items-center gap-2">
              <Mail size={16} className="text-[#0B66FF]" />
              support@technaam.com
            </li>
            <li className="text-slate-400">
              Mandi Bahauddin,
              <br />
              Punjab, Pakistan.
            </li>
          </ul>
          <div className="mt-8 pt-8 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              © 2025 TechNaam. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
