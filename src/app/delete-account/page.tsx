import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Delete Account | LegalSphere by TechNaam",
  description:
    "Instructions for permanently deleting your LegalSphere account and associated cloud data.",
};

export default function DeleteAccountPage() {
  return (
    <main className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-12 border-b border-slate-100 pb-8">
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Delete Your LegalSphere Account
          </h1>
          <p className="text-slate-500 text-sm md:text-base">
            Learn how to permanently delete your LegalSphere account and
            associated cloud data.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-12 text-slate-700 leading-relaxed">
          {/* 1. Overview */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              1. Overview
            </h2>
            <p className="mb-4">
              At <strong>TechNaam</strong>, we believe you should have complete
              control over your data. Deleting your <strong>LegalSphere</strong>{" "}
              account permanently removes your cloud account information and
              associated data from our servers.
            </p>
            <p>
              If you have been using LegalSphere without enabling cloud backup,
              your data has been stored locally on your device. In this case,
              simply deleting the app from your device will remove all
              locally-stored data.
            </p>
          </section>

          {/* 2. Method 1 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              2. Method 1: Delete Inside the App
            </h2>
            <p className="mb-4">
              The easiest way to delete your LegalSphere account is directly
              within the app:
            </p>
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <ol className="list-decimal pl-5 space-y-3 text-slate-700">
                <li>Open the LegalSphere app on your device</li>
                <li>
                  Navigate to <strong>Settings</strong>
                </li>
                <li>
                  Tap on <strong>Account</strong>
                </li>
                <li>
                  Select <strong>Delete Account</strong>
                </li>
                <li>
                  Carefully read the confirmation message and confirm your
                  request
                </li>
              </ol>
              <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-blue-700">Note:</span>{" "}
                  Confirmation is required to prevent accidental deletion. Once
                  confirmed, the deletion process cannot be reversed.
                </p>
              </div>
            </div>
          </section>

          {/* 3. Method 2 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              3. Method 2: Request Deletion by Email
            </h2>
            <p className="mb-4">
              If you are unable to access the app or prefer to request deletion
              via email, you can contact our support team:
            </p>
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Support Email:
                  </p>
                  <a
                    href="mailto:support@technaam.com"
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    support@technaam.com
                  </a>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Subject Line:
                  </p>
                  <p className="text-slate-700 font-medium">
                    Delete My LegalSphere Account
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Please Include:
                  </p>
                  <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-700">
                    <li>Your registered email address</li>
                    <li>Your full name (optional)</li>
                    <li>Reason for deletion (optional)</li>
                  </ul>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              We will verify your identity to ensure the security of your
              account before processing the deletion request.
            </p>
          </section>

          {/* 4. Processing Time */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              4. Processing Time
            </h2>
            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r">
              <p className="text-slate-700">
                <span className="font-semibold">
                  Verified deletion requests
                </span>{" "}
                are normally completed within{" "}
                <span className="font-semibold">7 business days</span>.
              </p>
              <p className="text-sm text-slate-600 mt-2">
                You will receive a confirmation email once your account has been
                permanently deleted.
              </p>
            </div>
          </section>

          {/* 5. Data Deleted */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              5. Data That Will Be Deleted
            </h2>
            <p className="mb-4">
              When you delete your LegalSphere account, the following data will
              be permanently removed from our cloud servers where applicable:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                "Account profile information",
                "Cloud backup data",
                "Case records",
                "Client information",
                "Diary entries",
                "Legal notes",
                "Uploaded documents",
                "AI history and interactions",
                "App settings and preferences",
                "All uploaded files",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border border-slate-200"
                >
                  <svg
                    className="w-4 h-4 text-red-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span className="text-sm text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 6. Data Retention */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              6. Data That May Be Retained
            </h2>
            <p className="mb-4">
              In limited circumstances, we may retain certain records only when
              required by applicable law or to comply with legal obligations.
              This may include:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Transaction records for tax or accounting purposes (if
                applicable)
              </li>
              <li>
                Communications related to legal disputes or regulatory inquiries
              </li>
              <li>Records required by Pakistani law or court orders</li>
            </ul>
            <p className="mt-4 text-sm text-slate-500">
              Any retained data will be kept only for as long as legally
              required and will not be used for any other purpose.
            </p>
          </section>

          {/* 7. Offline Users */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              7. Important Information for Offline Users
            </h2>
            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r">
              <p className="font-semibold text-slate-900 mb-2">
                Offline-First Architecture
              </p>
              <p className="text-slate-700 mb-2">
                LegalSphere is designed as an <strong>offline-first</strong>{" "}
                application. If you have never enabled cloud backup:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li>
                  All your data is stored locally on your device using SQLite
                </li>
                <li>
                  Simply deleting the app from your device will remove all
                  locally-stored data
                </li>
                <li>
                  No cloud data exists to delete since backup was never enabled
                </li>
              </ul>
              <p className="text-sm text-slate-600 mt-3">
                If you have enabled cloud backup at any point, please follow the
                account deletion methods above to ensure your cloud data is also
                removed.
              </p>
            </div>
          </section>

          {/* 8. Need Help? */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              8. Need Help?
            </h2>
            <p className="mb-4">
              If you have any questions about the account deletion process or
              need assistance, our support team is here to help:
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
            <p className="text-sm text-slate-500">
              For more information about how we handle your data, please review
              our{" "}
              <Link
                href="/privacy"
                className="text-indigo-600 hover:underline font-medium"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
