import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions | LegalSphere by TechNaam",
  description:
    "Terms and Conditions governing the use of LegalSphere, AI services, document processing, cloud backup, and TechNaam products.",
};

export default function TermsPage() {
  return (
    <main className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-12 border-b border-slate-100 pb-8">
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Terms & Conditions
          </h1>
          <p className="text-slate-500 text-sm md:text-base">
            Please read these Terms & Conditions carefully before using
            LegalSphere.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-12 text-slate-700 leading-relaxed">
          {/* 1. Acceptance of Terms */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="mb-4">
              By downloading, installing, accessing, or using{" "}
              <strong>LegalSphere</strong> (the App) and associated services
              provided by <strong>TechNaam</strong> (we, our, or us), you agree
              to be bound by these Terms & Conditions (the Terms).
            </p>
            <p>
              If you do not agree to these Terms, please do not use our
              Services. Your continued use of LegalSphere constitutes your
              acceptance of these Terms and any future updates.
            </p>
          </section>

          {/* 2. About LegalSphere */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              2. About LegalSphere
            </h2>
            <p className="mb-4">
              LegalSphere is an{" "}
              <strong>AI-powered legal practice management platform</strong>{" "}
              developed by TechNaam for advocates, law firms, and legal
              professionals. The App provides a comprehensive suite of tools
              designed to streamline legal practice management, including:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                "Case Management",
                "Hearing Diary",
                "Client Management",
                "Document Vault",
                "AI Features (Lex AI, AI ChatRoom, AI Document Analysis)",
                "OCR (Optical Character Recognition)",
                "Cloud Backup (Optional)",
                "Offline SQLite Storage",
              ].map((feature) => (
                <div
                  key={feature}
                  className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border border-slate-200"
                >
                  <svg
                    className="w-4 h-4 text-indigo-600 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-sm text-slate-700">{feature}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Eligibility */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              3. Eligibility
            </h2>
            <p>
              You must be at least <strong>18 years old</strong> or legally
              capable of entering into binding agreements to use LegalSphere. By
              using our Services, you represent and warrant that you meet these
              eligibility requirements and have the authority to accept these
              Terms.
            </p>
          </section>

          {/* 4. User Responsibilities */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              4. User Responsibilities
            </h2>
            <p className="mb-4">By using LegalSphere, you agree to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Maintain accurate and up-to-date information in your account
                profile.
              </li>
              <li>
                Protect your login credentials and not share them with
                unauthorized individuals.
              </li>
              <li>
                Use the App in compliance with all applicable laws and
                regulations.
              </li>
              <li>
                Respect the intellectual property rights of TechNaam and third
                parties.
              </li>
              <li>
                Avoid misuse of AI features, including generating harmful,
                misleading, or illegal content.
              </li>
              <li>
                Not upload, store, or share illegal, offensive, or infringing
                content through the App.
              </li>
            </ul>
          </section>

          {/* 5. AI Services */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              5. AI Services
            </h2>
            <p className="mb-4">
              LegalSphere provides <strong>optional</strong> AI-powered features
              to enhance your legal practice, including:
            </p>
            <ul className="list-disc pl-5 space-y-2 mb-4">
              <li>
                <strong>Lex AI:</strong> AI-powered legal research and
                assistance.
              </li>
              <li>
                <strong>AI ChatRoom:</strong> Interactive AI chat for legal
                queries and brainstorming.
              </li>
              <li>
                <strong>AI Document Analysis:</strong> AI-powered analysis of
                legal documents for insights and summarization.
              </li>
            </ul>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r">
              <p className="font-medium text-slate-900 mb-2">
                Important AI Disclaimer:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>
                  AI-generated responses may contain inaccuracies or incomplete
                  information.
                </li>
                <li>
                  AI responses are for{" "}
                  <strong>informational purposes only</strong> and do not
                  constitute legal advice.
                </li>
                <li>
                  You are responsible for independently verifying all
                  AI-generated content and legal research.
                </li>
                <li>
                  Lawyers remain fully responsible for their professional
                  judgment and legal drafting.
                </li>
              </ul>
            </div>
          </section>

          {/* 6. OCR & Document Processing */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              6. OCR & Document Processing
            </h2>
            <p className="mb-4">
              LegalSphere includes an OCR (Optical Character Recognition)
              feature that processes images and PDF documents to extract text.
              When you use this feature:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>You retain full ownership and control of your documents.</li>
              <li>
                OCR processing occurs only when explicitly requested by you.
              </li>
              <li>
                Your images and documents may be securely transmitted to{" "}
                <strong>Google Cloud Vision</strong> for text extraction.
              </li>
              <li>
                Processed content is returned to your device and stored locally.
              </li>
            </ul>
          </section>

          {/* 7. Cloud Backup */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              7. Cloud Backup
            </h2>
            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r mb-4">
              <p className="font-semibold text-slate-900 mb-2">
                Optional Cloud Synchronization
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-700">
                <li>
                  Cloud Backup is <strong>entirely optional</strong> and can be
                  enabled or disabled at any time in the App settings.
                </li>
                <li>
                  Your local SQLite database remains the primary storage
                  mechanism and continues to function without cloud sync.
                </li>
                <li>
                  When enabled, your data is securely synced to{" "}
                  <strong>Firebase</strong> for backup and cross-device
                  synchronization.
                </li>
                <li>
                  You retain full control over your data and can disable cloud
                  backup at any time.
                </li>
              </ul>
            </div>
          </section>

          {/* 8. Intellectual Property */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              8. Intellectual Property
            </h2>
            <p className="mb-4">
              All intellectual property rights in LegalSphere, including but not
              limited to:
            </p>
            <ul className="list-disc pl-5 space-y-2 mb-4">
              <li>The LegalSphere name and branding</li>
              <li>The TechNaam name and logo</li>
              <li>All logos, trademarks, and service marks</li>
              <li>Source code, UI design, and visual elements</li>
              <li>Documentation and associated materials</li>
            </ul>
            <p>
              are the exclusive property of <strong>TechNaam</strong>.
            </p>
            <p className="mt-4">
              You retain full ownership of all documents, case records, and
              legal files you upload to LegalSphere. These Terms do not transfer
              any ownership rights to us.
            </p>
          </section>

          {/* 9. Privacy */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              9. Privacy
            </h2>
            <p className="mb-4">
              Your privacy is important to us. Our collection, use, and
              protection of your personal information are governed by our{" "}
              <Link
                href="/privacy"
                className="text-indigo-600 hover:underline font-medium"
              >
                Privacy Policy
              </Link>
              .
            </p>
            <p>
              By using LegalSphere, you consent to the collection and use of
              your information as described in our Privacy Policy.
            </p>
          </section>

          {/* 10. Limitation of Liability */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              10. Limitation of Liability
            </h2>
            <p className="mb-4">
              To the maximum extent permitted by applicable law, TechNaam and
              its affiliates shall not be liable for:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Any data loss or corruption</li>
              <li>Incorrect, incomplete, or misleading AI responses</li>
              <li>Business interruption or loss of revenue</li>
              <li>Missed court deadlines or legal obligations</li>
              <li>Any legal outcomes or judicial decisions</li>
              <li>Indirect, incidental, or consequential damages</li>
            </ul>
            <p className="mt-4">
              Some jurisdictions do not allow the exclusion of certain
              warranties or the limitation of liability for incidental or
              consequential damages. In such jurisdictions, our liability is
              limited to the maximum extent permitted by law.
            </p>
          </section>

          {/* 11. Disclaimer */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              11. Disclaimer
            </h2>
            <div className="bg-slate-50 border-l-4 border-slate-700 p-4 rounded-r">
              <p className="font-medium text-slate-900 mb-2">
                Legal Disclaimer:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm">
                <li>
                  LegalSphere is a <strong>productivity platform</strong> and
                  does not replace professional legal advice.
                </li>
                <li>
                  TechNaam is not a law firm and does not provide legal
                  services.
                </li>
                <li>
                  Use of LegalSphere does not create a lawyer-client
                  relationship between you and TechNaam.
                </li>
                <li>
                  You are solely responsible for your legal decisions and
                  professional conduct.
                </li>
                <li>
                  We do not guarantee the accuracy, completeness, or reliability
                  of any information provided through the App.
                </li>
              </ul>
            </div>
          </section>

          {/* 12. Suspension & Termination */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              12. Suspension & Termination
            </h2>
            <p className="mb-4">
              TechNaam reserves the right to suspend, restrict, or terminate
              your access to LegalSphere at any time, without prior notice, if:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>You violate these Terms & Conditions</li>
              <li>You engage in illegal or fraudulent activity</li>
              <li>Your use of the App poses a security risk</li>
              <li>We are required to do so by law or regulatory authorities</li>
            </ul>
            <p className="mt-4">
              Upon termination, your right to use the App will immediately
              cease. You may request deletion of your data as described in our{" "}
              <Link
                href="/delete-account"
                className="text-indigo-600 hover:underline font-medium"
              >
                Delete Account
              </Link>{" "}
              page.
            </p>
          </section>

          {/* 13. Changes to Terms */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              13. Changes to Terms
            </h2>
            <p className="mb-4">
              We may update these Terms & Conditions from time to time to
              reflect changes in our practices, technology, legal requirements,
              or regulatory obligations. We will notify you of any material
              changes by:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Posting the updated Terms on this page</li>
              <li>
                Displaying a prominent notice within the App for significant
                changes
              </li>
              <li>
                Sending notification to your registered email address (if
                applicable)
              </li>
            </ul>
            <p className="mt-4">
              Your continued use of LegalSphere after such changes constitutes
              your acceptance of the updated Terms.
            </p>
          </section>

          {/* 14. Governing Law */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              14. Governing Law
            </h2>
            <p className="mb-4">
              These Terms & Conditions shall be governed by and construed in
              accordance with the laws of the{" "}
              <strong>Islamic Republic of Pakistan</strong>.
            </p>
            <p>
              Any disputes arising out of or relating to these Terms shall be
              subject to the exclusive jurisdiction of the competent courts of
              Pakistan, located in Mandi Bahauddin, Punjab.
            </p>
          </section>

          {/* 15. Contact */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              15. Contact Us
            </h2>
            <p className="mb-4">
              If you have any questions, concerns, or requests regarding these
              Terms & Conditions, please contact us:
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
              We aim to respond to all inquiries within 2 business days.
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
                href="/delete-account"
                className="text-sm text-indigo-600 hover:underline font-medium"
              >
                Delete Account
              </Link>
              <a
                href="mailto:support@technaam.com"
                className="text-sm text-indigo-600 hover:underline font-medium"
              >
                Support
              </a>
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
