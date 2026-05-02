import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | TechNaam & Apps",
  description:
    "Privacy Policy for TechNaam, CardSphere, and LegalSphereDiary.",
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
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4">
            Privacy Policy
          </h1>
          <p className="text-slate-500">Last Updated: {currentDate}</p>
        </div>

        {/* Legal Content */}
        <div className="space-y-12 text-slate-700 leading-relaxed">
          {/* 1 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              1. Introduction
            </h2>
            <p className="mb-4">
              Welcome to <strong>TechNaam</strong> (we, our, or us). We are
              committed to protecting your privacy. This Privacy Policy explains
              how we collect, use, and safeguard your information when you visit
              our website (www.technaam.com) or use our mobile applications,
              including <strong>CardSphere</strong>,{" "}
              <strong>LegalSphereDiary</strong>, and other digital tools
              (collectively, the Services).
            </p>
            <p className="mb-4">
              Our applications may store your data locally on your device
              (offline mode) and securely sync it with cloud services when an
              internet connection is available.
            </p>
            <p>
              By using our Services, you agree to the collection and use of
              information in accordance with this policy.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              2. Information We Collect
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Personal Data:</strong> Name, Email address, Phone
                number, and professional details (e.g., Bar Council License No).
              </li>
              <li>
                <strong>Usage Data:</strong> Device type, IP address, OS version,
                and app usage behavior.
              </li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              3. How We Use Your Data
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide and maintain our Services.</li>
              <li>To sync and manage your legal data securely.</li>
              <li>To provide customer support.</li>
              <li>To improve app performance and features.</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              4. Permissions & Third-Party Services
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Camera/Gallery:</strong> For uploading profile images or
                scanning QR codes.
              </li>
              <li>
                <strong>Contacts:</strong> For saving digital cards.
              </li>
              <li>
                <strong>Location:</strong> For maps and address features.
              </li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              5. Data Security
            </h2>
            <p>
              We use secure technologies and encryption to protect your data.
              However, no system is 100% secure, and we cannot guarantee absolute
              security.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              6. Data Sharing & Third Parties
            </h2>
            <p className="mb-4">
              We do not sell your personal data. However, we use trusted
              third-party services:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Firebase (Google):</strong> Authentication, database, and
                syncing.
              </li>
              <li>
                <strong>Google APIs:</strong> Maps and location services.
              </li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              7. Data Retention
            </h2>
            <p>
              We retain your data only as long as necessary. You may request
              deletion of your data at any time.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              8. Your Rights
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You can access your data.</li>
              <li>You can request corrections.</li>
              <li>You can request deletion of your account.</li>
            </ul>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              9. Children&apos;s Privacy
            </h2>
            <p>
              Our Services are not intended for children under 13. We do not
              knowingly collect data from children.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              10. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy. Changes will be posted on this
              page.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              11. Contact Us
            </h2>
            <ul className="mt-4 space-y-2 font-medium text-slate-900">
              <li>Support Email: support@technaam.com</li>
              <li>Admin Email: admin@technaam.com</li>
              <li>Mandi Bahauddin, Pakistan</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}