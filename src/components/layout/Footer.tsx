"use client";

import Link from "next/link";
import {
  Linkedin,
  Twitter,
  Facebook,
  Mail,
  Instagram,
  Phone,
  Video,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* Column 1: Brand & Socials */}
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

          {/* Social Media Icons */}
          <div className="flex space-x-4 mt-6">
            <a
              href="https://www.linkedin.com/in/atta-ur-rehman-dhothar"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin size={20} />
            </a>
            <a
              href="https://x.com/atta_rehman4"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              aria-label="Twitter / X"
            >
              <Twitter size={20} />
            </a>
            <a
              href="https://www.facebook.com/share/1AEvKkoSQW/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              aria-label="Facebook"
            >
              <Facebook size={20} />
            </a>
            <a
              href="https://www.instagram.com/draftdeskhub?igsh=MXNlamxndnBmdzM4bw=="
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              aria-label="Instagram"
            >
              <Instagram size={20} />
            </a>
            <a
              href="https://tiktok.com/@technaam"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              aria-label="TikTok"
            >
              <Video size={20} />
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
            <li>
              <Link
                href="/legal-tools"
                className="hover:text-[#0B66FF] transition-colors"
              >
                DraftDesk Templates
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Legal Center */}
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
              <Phone size={16} className="text-[#0B66FF]" />
              <a
                href="https://wa.me/923226616029"
                target="_blank"
                className="hover:text-white transition-colors"
              >
                +92 322 6616029
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={16} className="text-[#0B66FF]" />
              support@technaam.com
            </li>
            <li className="text-slate-400 mt-2">
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
