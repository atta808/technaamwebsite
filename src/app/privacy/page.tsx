import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | LegalSphere by TechNaam",
  description:
    "Privacy Policy for LegalSphere, explaining data collection, AI processing, OCR, Firebase, cloud backup, offline storage, security, and user rights.",
};

export default function PrivacyPage() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-12 border-b border-slate-100 pb-8">
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-slate-500 text-sm md:text-base">
            Last Updated: {currentDate}
          </p>
        </div>

        {/* Legal Content */}
        <div className="space-y-12 text-slate-700 leading-relaxed">
          {/* 1. Introduction */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              1. Introduction
            </h2>
            <p className="mb-4">
              Welcome to <strong>LegalSphere</strong> by{" "}
              <strong>TechNaam</strong> (we, our, or us). We are committed to
              protecting your privacy. This Privacy Policy explains how we
              collect, use, and safeguard your information when you use our
              mobile application <strong>LegalSphere</strong> (the App) and
              associated services (collectively, the Services).
            </p>
            <p>
              LegalSphere is an <strong>offline-first</strong> legal practice
              management platform designed for advocates, law firms, and legal
              professionals. Our App stores your data locally on your device
              using a secure SQLite database and offers optional cloud
              synchronization through Firebase.
            </p>
            <p className="mt-4">
              By using our Services, you agree to the collection and use of
              information in accordance with this policy.
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              2. Information We Collect
            </h2>
            <p className="mb-4">
              LegalSphere collects the following types of information to provide
              and improve our Services:
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">
              a. Personal Information You Provide
            </h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Profile Information:</strong> Name, email address, phone
                number, professional credentials (e.g., Bar Council License
                Number), and profile photo.
              </li>
              <li>
                <strong>Case Information:</strong> Case details, hearing dates,
                court information, and legal documents you upload.
              </li>
              <li>
                <strong>Client Information:</strong> Client names, contact
                details, and related case data.
              </li>
              <li>
                <strong>Legal Notes & Documents:</strong> Notes, PDF files,
                images, and other documents you create or upload within the App.
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">
              b. Automatically Collected Information
            </h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Usage Data:</strong> Device type, operating system
                version, IP address, app usage patterns, and diagnostic logs to
                improve performance and fix issues.
              </li>
              <li>
                <strong>Device Information:</strong> Device model, screen
                resolution, and unique device identifiers for authentication and
                security purposes.
              </li>
            </ul>
          </section>

          {/* 3. How We Use Your Data */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              3. How We Use Your Data
            </h2>
            <p className="mb-4">
              We use the collected information for the following purposes:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide, maintain, and improve our Services.</li>
              <li>
                To manage your legal cases, clients, documents, and diary
                entries.
              </li>
              <li>
                To synchronize your data across devices when cloud backup is
                enabled.
              </li>
              <li>
                To process AI requests (Lex AI, AI ChatRoom, AI Document
                Analysis) using selected third-party providers.
              </li>
              <li>
                To process OCR (Optical Character Recognition) requests for text
                extraction from images and documents.
              </li>
              <li>To send hearing notifications and reminders.</li>
              <li>To provide customer support and respond to inquiries.</li>
              <li>
                To analyze app usage and improve user experience and features.
              </li>
              <li>
                To comply with legal obligations and enforce our terms of
                service.
              </li>
            </ul>
          </section>

          {/* 4. Offline Storage & Cloud Sync */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              4. Offline Storage & Cloud Sync
            </h2>
            <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-3">
              a. Offline-First Architecture
            </h3>
            <p className="mb-4">
              LegalSphere is designed as an <strong>offline-first</strong>{" "}
              application. All your data—including case records, clients,
              documents, notes, diary entries, and settings—is stored locally on
              your device using a secure SQLite database. This ensures you can
              access and manage your legal practice even without an internet
              connection.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">
              b. Optional Cloud Backup
            </h3>
            <p className="mb-4">
              We offer an <strong>optional</strong> cloud backup feature using
              Firebase. When you enable this feature:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Your local data is securely synced to Firebase servers for
                backup and cross-device synchronization.
              </li>
              <li>
                You retain full control over your data and can disable cloud
                backup at any time.
              </li>
              <li>
                Cloud backup is encrypted and stored in compliance with
                industry-standard security practices.
              </li>
            </ul>
            <p className="mt-4">
              <strong>Note:</strong> You can disable cloud backup in the App
              settings at any time, and your local data will remain unaffected.
            </p>
          </section>

          {/* 5. Permissions */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              5. App Permissions
            </h2>
            <p className="mb-4">
              LegalSphere requires certain permissions to provide its features.
              We only request permissions that are essential for the
              functionality you choose to use:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Camera:</strong> To capture images for documents, upload
                profile photos, or scan documents for OCR.
              </li>
              <li>
                <strong>Photos/Media/Files:</strong> To upload existing images,
                PDFs, and other documents from your device for storage, OCR, or
                sharing.
              </li>
              <li>
                <strong>Notifications:</strong> To send hearing reminders,
                updates, and important notifications about your cases.
              </li>
              <li>
                <strong>Internet:</strong> To enable cloud sync, AI features,
                OCR processing, and other online functionalities.
              </li>
            </ul>
            <p className="mt-4">
              You can manage these permissions through your device settings at
              any time.
            </p>
          </section>

          {/* 6. AI Features & Transparency */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              6. AI Features & Transparency
            </h2>
            <p className="mb-4">
              LegalSphere includes optional AI-powered features to enhance your
              legal practice:
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
            <p className="mb-4">
              When you use these features, the content you submit (such as case
              details, legal questions, or documents) may be securely
              transmitted to our AI service providers, including{" "}
              <strong>DeepSeek API</strong>, for processing.
            </p>
            <div className="bg-slate-50 border-l-4 border-indigo-500 p-4 my-4 rounded-r">
              <p className="font-medium text-slate-900 mb-2">
                AI Disclaimer & Important Information:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>
                  AI features are completely <strong>optional</strong> and can
                  be disabled in settings.
                </li>
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
                  You are responsible for verifying all AI-generated content and
                  legal research.
                </li>
                <li>
                  LegalSphere does not create a lawyer-client relationship.
                </li>
              </ul>
            </div>
          </section>

          {/* 7. OCR Processing */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              7. OCR Processing
            </h2>
            <p className="mb-4">
              LegalSphere includes an OCR (Optical Character Recognition)
              feature to extract text from images and PDF documents. When you
              use this feature:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Images or documents you select are securely transmitted to{" "}
                <strong>Google Cloud Vision</strong> for text extraction.
              </li>
              <li>
                Processed content is returned to your device and stored locally
                in your LegalSphere database.
              </li>
              <li>
                Google Cloud Vision processes the content solely for OCR
                purposes and does not retain your data.
              </li>
            </ul>
            <p className="mt-4">
              If enabled in future versions, we may integrate additional OCR
              services such as OCR.Space to provide alternative processing
              options.
            </p>
          </section>

          {/* 8. Third-Party Services */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              8. Third-Party Services
            </h2>
            <p className="mb-4">
              LegalSphere integrates with trusted third-party services to
              provide essential functionality. We do not sell your data to third
              parties:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Firebase (Google):</strong> Authentication, database
                storage, cloud backup, and push notifications.
              </li>
              <li>
                <strong>Google Cloud Vision:</strong> OCR processing for text
                extraction from images and documents.
              </li>
              <li>
                <strong>DeepSeek API:</strong> AI processing for Lex AI, AI
                ChatRoom, and AI Document Analysis.
              </li>
              <li>
                <strong>Google Play Services:</strong> Push notifications, app
                updates, and device compatibility.
              </li>
            </ul>
            <p className="mt-4">
              Each third-party service has its own privacy policy, and we
              encourage you to review them.
            </p>
          </section>

          {/* 9. Data Security */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              9. Data Security
            </h2>
            <p className="mb-4">
              We implement robust security measures to protect your data:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Transmission:</strong> All data transmitted over the
                internet is secured using HTTPS and encrypted connections.
              </li>
              <li>
                <strong>Cloud Storage:</strong> Firebase services use
                enterprise-grade security, including encryption at rest and in
                transit.
              </li>
              <li>
                <strong>Local Storage:</strong> Your local SQLite database is
                stored securely on your device with platform-level security
                protections.
              </li>
              <li>
                <strong>Access Control:</strong> Authentication is required to
                access your account, and you can revoke access at any time.
              </li>
            </ul>
            <p className="mt-4">
              While we employ industry-standard security practices, no system is
              100% secure. We cannot guarantee absolute security, and you use
              our Services at your own risk.
            </p>
          </section>

          {/* 10. Data Retention */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              10. Data Retention
            </h2>
            <p className="mb-4">
              We retain your data only as long as necessary to provide our
              Services or as required by applicable law:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Local Data:</strong> Stored on your device until you
                delete it through the App.
              </li>
              <li>
                <strong>Cloud Data:</strong> Retained as long as you maintain a
                LegalSphere account or enable cloud backup.
              </li>
              <li>
                <strong>Account Data:</strong> Retained until you delete your
                account or request deletion.
              </li>
            </ul>
            <p className="mt-4">
              You may request deletion of your data at any time through the App
              settings or by contacting our support team.
            </p>
          </section>

          {/* 11. Your Rights */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              11. Your Rights
            </h2>
            <p className="mb-4">
              Depending on your jurisdiction, you may have the following rights:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Access:</strong> Review the data we hold about you.
              </li>
              <li>
                <strong>Correction:</strong> Request corrections to inaccurate
                or incomplete data.
              </li>
              <li>
                <strong>Deletion:</strong> Delete your local data and request
                cloud data deletion.
              </li>
              <li>
                <strong>Export:</strong> Export your data in a portable format.
              </li>
              <li>
                <strong>Opt-Out:</strong> Disable cloud backup and AI features
                at any time.
              </li>
              <li>
                <strong>Withdraw Consent:</strong> Withdraw consent for data
                processing by disabling cloud backup or deleting your account.
              </li>
            </ul>
            <p className="mt-4">
              To exercise these rights, contact us at{" "}
              <a
                href="mailto:support@technaam.com"
                className="text-indigo-600 hover:underline"
              >
                support@technaam.com
              </a>
              .
            </p>
          </section>

          {/* 12. Children's Privacy */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              12. Children&apos;s Privacy
            </h2>
            <p>
              LegalSphere is not intended for use by children under 13 years of
              age. We do not knowingly collect personal information from
              children. If we become aware that we have collected personal data
              from a child without parental consent, we will take steps to
              delete it. If you believe we have collected such data, please
              contact us immediately.
            </p>
          </section>

          {/* 13. Legal Disclaimer */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              13. Legal Disclaimer
            </h2>
            <div className="bg-slate-50 border-l-4 border-slate-700 p-4 rounded-r">
              <p className="font-medium text-slate-900 mb-2">
                Important Legal Notice:
              </p>
              <p className="text-sm mb-3">
                LegalSphere is a legal productivity platform designed to assist
                legal professionals in managing their practice more efficiently.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>
                  <strong>
                    AI-generated responses and recommendations are not legal
                    advice.
                  </strong>
                </li>
                <li>
                  Users are responsible for independently verifying all legal
                  research, information, and drafting.
                </li>
                <li>
                  LegalSphere does not create a lawyer-client relationship
                  between you and TechNaam.
                </li>
                <li>
                  The App is a productivity tool and does not replace
                  professional legal judgment or consultation.
                </li>
              </ul>
              <p className="text-sm mt-3">
                By using LegalSphere, you acknowledge and accept these
                limitations.
              </p>
            </div>
          </section>

          {/* 14. Changes to This Policy */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              14. Changes to This Privacy Policy
            </h2>
            <p className="mb-4">
              We may update this Privacy Policy from time to time to reflect
              changes in our practices, technology, legal requirements, or
              regulatory obligations. We will notify you of any material changes
              by:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Posting the updated policy on this page.</li>
              <li>
                Displaying a prominent notice within the App for significant
                changes.
              </li>
              <li>
                Sending notification to your registered email address (if
                applicable).
              </li>
            </ul>
            <p className="mt-4">
              The updated policy will take effect on the date specified in the
              the <strong>Last Updated</strong> section. We encourage you to
              review this page periodically to stay informed about our privacy
              practices.
            </p>
          </section>

          {/* 15. Contact Us */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              15. Contact Us
            </h2>
            <p className="mb-4">
              If you have any questions, concerns, or requests regarding this
              Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
              <ul className="space-y-3 text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="font-semibold text-slate-900 min-w-30">
                    Support:
                  </span>
                  <a
                    href="mailto:support@technaam.com"
                    className="text-indigo-600 hover:underline"
                  >
                    support@technaam.com
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-semibold text-slate-900 min-w-30">
                    Admin:
                  </span>
                  <a
                    href="mailto:admin@technaam.com"
                    className="text-indigo-600 hover:underline"
                  >
                    admin@technaam.com
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-semibold text-slate-900 min-w-30">
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
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-semibold text-slate-900 min-w-30">
                    Address:
                  </span>
                  <span>Mandi Bahauddin, Punjab, Pakistan</span>
                </li>
              </ul>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              We aim to respond to all inquiries within 7 business days.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
