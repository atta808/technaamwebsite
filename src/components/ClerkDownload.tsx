"use client";

import Image from "next/image";
import { Download, ShieldCheck, Smartphone } from "lucide-react";

const APK_DOWNLOAD_URL =
  "https://drive.google.com/uc?export=download&id=1lD-9yaXJFXs_40FY4GjrvEe-pUGettf-";

export default function ClerkDownload() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <section className="w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-8 sm:p-12 lg:p-16">
              <div className="mb-10">
                <Image
                  src="/logo.jpg"
                  alt="TechNaam"
                  width={220}
                  height={90}
                  className="h-auto w-[190px] object-contain object-left"
                  priority
                />
              </div>

              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-sm font-medium text-blue-200">
                <ShieldCheck className="h-4 w-4" />
                Official TechNaam App
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                TechNaam Clerk
                <span className="block text-blue-400">Mobile App</span>
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
                Install the official Clerk application for the TechNaam Work
                system on your Android phone.
              </p>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-300">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                  <Smartphone className="h-4 w-4" />
                  Android APK
                </span>
                <span className="rounded-full bg-white/10 px-4 py-2">
                  84 MB
                </span>
              </div>

              <a
                href={APK_DOWNLOAD_URL}
                className="mt-10 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-500 px-6 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400 sm:w-auto"
              >
                <Download className="h-5 w-5" />
                Download Clerk App
              </a>

              <p className="mt-5 text-sm leading-6 text-slate-400">
                The APK is hosted on Google Drive. If Google Drive displays a
                safety warning because the APK is too large to scan, choose
                <span className="font-semibold text-slate-200">
                  {" "}
                  Download anyway
                </span>
                .
              </p>
            </div>

            <div className="flex items-center justify-center border-t border-white/10 bg-gradient-to-br from-blue-600/20 via-cyan-500/10 to-transparent p-8 lg:border-l lg:border-t-0 lg:p-12">
              <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-black/20 p-8 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
                  <Smartphone className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold">Ready to install?</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Download the APK, open it on your Android device, and follow
                  the installation prompts.
                </p>
                <div className="mt-6 rounded-2xl bg-white/5 p-4 text-left text-sm text-slate-300">
                  <p className="font-semibold text-white">Important</p>
                  <p className="mt-1">
                    Only install the Clerk APK obtained from this official
                    TechNaam download page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
