import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support | LegalSphere by TechNaam",
  description:
    "Get help with LegalSphere, report bugs, contact support, request features, and access frequently asked questions.",
};

export default function SupportPage() {
  return (
    <main className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-12 border-b border-slate-100 pb-8">
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Support Center
          </h1>
          <p className="text-slate-500 text-sm md:text-base">
            We&apos;re here to help you get the most from LegalSphere.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-12 text-slate-700 leading-relaxed">
          {/* 1. Contact Support */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              1. Contact Support
            </h2>
            <p className="mb-4">
              Our support team is available to assist you with any questions,
              concerns, or issues you may encounter while using LegalSphere.
            </p>
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="font-semibold text-slate-900 min-w-25">
                    Support:
                  </span>
                  <a
                    href="mailto:support@technaam.com"
                    className="text-indigo-600 hover:underline"
                  >
                    support@technaam.com
                  </a>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-semibold text-slate-900 min-w-25">
                    Admin:
                  </span>
                  <a
                    href="mailto:admin@technaam.com"
                    className="text-indigo-600 hover:underline"
                  >
                    admin@technaam.com
                  </a>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-semibold text-slate-900 min-w-25">
                    Website:
                  </span>
                  <a
                    href="https://technaam.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    technaam.com
                  </a>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-semibold text-slate-900 min-w-25">
                    Location:
                  </span>
                  <span>Mandi Bahauddin, Punjab, Pakistan</span>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              We aim to respond to all inquiries within{" "}
              <span className="font-semibold text-slate-700">
                2 business days
              </span>
              .
            </p>
          </section>

          {/* 2. Frequently Asked Questions */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              2. Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: "How do I create an account?",
                  a: "Download LegalSphere from the Google Play Store, open the app, and tap 'Sign Up'. Enter your email address, create a secure password, and complete your profile with your professional information.",
                },
                {
                  q: "How do I enable cloud backup?",
                  a: "Open LegalSphere, go to Settings, select Cloud Backup, and toggle the switch to enable automatic synchronization. Your data will be securely backed up to Firebase when you have an internet connection.",
                },
                {
                  q: "How do I restore my backup?",
                  a: "When you sign in to LegalSphere on a new device with cloud backup enabled, your data will automatically sync. You can also manually trigger a restore from Settings > Cloud Backup > Restore Data.",
                },
                {
                  q: "How do I use Lex AI?",
                  a: "Lex AI is available from the main dashboard. Simply enter your legal question or research topic, and the AI will provide relevant information and insights. Remember to verify all AI-generated content.",
                },
                {
                  q: "How does AI Document Analysis work?",
                  a: "Upload a legal document (PDF or image) and select 'AI Analysis'. The system will analyze the content and provide summaries, key points, and insights. This feature uses DeepSeek API for processing.",
                },
                {
                  q: "How do I import PDF files?",
                  a: "Tap the 'Import Document' button in the Document Vault, select 'PDF', and choose a PDF file from your device. The file will be stored locally and can be searched using our searchable PDF feature.",
                },
                {
                  q: "How do I scan documents using OCR?",
                  a: "Use the camera icon within the Document Vault to capture an image of a document, or select an existing image from your gallery. The OCR feature will extract text using Google Cloud Vision.",
                },
                {
                  q: "How do I delete my account?",
                  a: "Go to Settings > Account > Delete Account. Follow the confirmation prompts. Alternatively, you can request deletion by emailing support@technaam.com. Learn more on our Delete Account page.",
                },
                {
                  q: "How do I report a bug?",
                  a: "Contact our support team at support@technaam.com with details about the bug, including the app version, device information, and steps to reproduce the issue. Screenshots are helpful.",
                },
                {
                  q: "How do I request a new feature?",
                  a: "We welcome your feedback! Send your feature requests to support@technaam.com with a detailed description of what you'd like to see. We regularly review user suggestions for future updates.",
                },
              ].map((faq, index) => (
                <div
                  key={index}
                  className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-200 bg-slate-100/50">
                    <h3 className="font-semibold text-slate-900 text-sm md:text-base">
                      {faq.q}
                    </h3>
                  </div>
                  <div className="p-4 text-slate-700 text-sm md:text-base">
                    {faq.a}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Bug Reporting */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              3. Bug Reporting
            </h2>
            <p className="mb-4">
              If you encounter any technical issues while using LegalSphere,
              please report them to our support team. To help us resolve the
              issue quickly, please include the following information:
            </p>
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
              <ul className="list-disc pl-5 space-y-2 text-slate-700">
                <li>
                  <span className="font-semibold">App Version:</span> Found in
                  Settings &gt; About
                </li>
                <li>
                  <span className="font-semibold">Android Version:</span> Your
                  <span className="font-semibold">Android Version:</span> Your
                  <span className="font-semibold">Android Version:</span> Your
                  <span className="font-semibold">Android Version:</span> Your
                  device&apos;s operating system versionn
                </li>
                <li>
                  <span className="font-semibold">Device Model:</span> The make
                  and model of your smartphone or tablet
                </li>
                <li>
                  <span className="font-semibold">Steps to Reproduce:</span>{" "}
                  Detailed step-by-step instructions to recreate the issue
                </li>
                <li>
                  <span className="font-semibold">Screenshots:</span> If
                  available, screenshots or screen recordings that illustrate
                  the problem
                </li>
              </ul>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Please send bug reports to{" "}
              <a
                href="mailto:support@technaam.com"
                className="text-indigo-600 hover:underline"
              >
                support@technaam.com
              </a>
              .
            </p>
          </section>

          {/* 4. Feature Requests */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              4. Feature Requests
            </h2>
            <p className="mb-4">
              We are committed to continuously improving LegalSphere based on
              user feedback. If you have ideas for new features or improvements,
              we want to hear from you.
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r">
              <p className="text-slate-700">
                <span className="font-semibold">How to submit:</span> Send your
                feature requests to{" "}
                <a
                  href="mailto:support@technaam.com"
                  className="text-indigo-600 hover:underline font-medium"
                >
                  support@technaam.com
                </a>{" "}
                with a detailed description of the feature and why it would
                benefit your legal practice.
              </p>
              <p className="text-sm text-slate-600 mt-2">
                Your feedback helps us prioritize our development roadmap and
                create the tools that matter most to legal professionals.
              </p>
            </div>
          </section>

          {/* 5. AI Support */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              5. AI Support
            </h2>
            <p className="mb-4">
              LegalSphere includes optional AI-powered features designed to
              enhance your legal practice:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {[
                "Lex AI - Legal Research",
                "AI ChatRoom - Interactive Queries",
                "AI Document Analysis",
              ].map((feature) => (
                <div
                  key={feature}
                  className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Important Note:</span> AI
                responses may contain inaccuracies and should always be
                independently verified. AI features are informational only and
                do not constitute legal advice. If you need assistance with AI
                features, please contact our support team.
              </p>
            </div>
          </section>

          {/* 6. Offline & Cloud Backup */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              6. Offline & Cloud Backup
            </h2>
            <p className="mb-4">
              LegalSphere is designed with an <strong>Offline-First</strong>{" "}
              architecture:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center space-x-2 mb-2">
                  <svg
                    className="w-5 h-5 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <h3 className="font-semibold text-slate-900">
                    Offline Storage
                  </h3>
                </div>
                <p className="text-sm text-slate-700">
                  All your data is stored locally on your device using a secure
                  SQLite database. You can access and manage your practice
                  without an internet connection.
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center space-x-2 mb-2">
                  <svg
                    className="w-5 h-5 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <h3 className="font-semibold text-slate-900">Cloud Backup</h3>
                </div>
                <p className="text-sm text-slate-700">
                  Optional Firebase Cloud Backup provides secure synchronization
                  across devices and automatic data protection. Enable it from
                  Settings.
                </p>
              </div>
            </div>
          </section>

          {/* 7. Privacy & Security */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              7. Privacy & Security
            </h2>
            <p className="mb-4">
              Your privacy and data security are our top priorities. For
              detailed information, please review our legal documents:
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/privacy"
                className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 text-indigo-600 hover:bg-slate-100 transition-colors font-medium text-sm"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 text-indigo-600 hover:bg-slate-100 transition-colors font-medium text-sm"
              >
                Terms & Conditions
              </Link>
              <Link
                href="/delete-account"
                className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 text-indigo-600 hover:bg-slate-100 transition-colors font-medium text-sm"
              >
                Delete Account
              </Link>
            </div>
          </section>

          {/* 8. Version Information */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              8. Version Information
            </h2>
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900 min-w-30">
                    Application:
                  </span>
                  <span className="text-slate-700">LegalSphere</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900 min-w-30">
                    Developer:
                  </span>
                  <span className="text-slate-700">TechNaam</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900 min-w-30">
                    Platform:
                  </span>
                  <span className="text-slate-700">Android</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900 min-w-30">
                    Current Version:
                  </span>
                  <span className="text-slate-700 font-medium">1.4.0</span>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Check the Google Play Store for the latest version updates and
              release notes.
            </p>
          </section>

          {/* Footer */}
          <div className="border-t border-slate-200 pt-8 mt-8">
            <div className="flex flex-wrap gap-6 justify-center md:justify-start">
              <Link
                href="/privacy"
                className="text-sm text-indigo-600 hover:underline font-medium"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-indigo-600 hover:underline font-medium"
              >
                Terms & Conditions
              </Link>
              <Link
                href="/delete-account"
                className="text-sm text-indigo-600 hover:underline font-medium"
              >
                Delete Account
              </Link>
              <Link
                href="/"
                className="text-sm text-indigo-600 hover:underline font-medium"
              >
                Home
              </Link>
            </div>
            <p className="text-sm text-slate-500 mt-4">
              &copy; {new Date().getFullYear()} TechNaam. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
