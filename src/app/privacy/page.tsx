import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | TechNaam & Apps",
  description: "Privacy Policy for TechNaam, CardSphere, and LegalSphereDiary.",
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
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              1. Introduction
            </h2>
            <p className="mb-4">
              Welcome to <strong>TechNaam</strong> (&quot;we,&quot;
              &quot;our,&quot; or &quot;us&quot;). We are committed to
              protecting your privacy. This Privacy Policy explains how we
              collect, use, and safeguard your information when you visit our
              website (www.technaam.com) or use our mobile applications,
              including <strong>CardSphere</strong>,{" "}
              <strong>LegalSphereDiary</strong>, and other digital tools
              (collectively, the &quot;Services&quot;).
            </p>
            <p>
              By using our Services, you agree to the collection and use of
              information in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              2. Information We Collect
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Personal Data:</strong> While using our Apps (like
                LegalSphereDiary), we may ask you to provide personally
                identifiable information, such as your Name, Email address,
                Phone number, and Professional details (e.g., Bar Council
                License No).
              </li>
              <li>
                <strong>Usage Data:</strong> We may collect information on how
                the Service is accessed and used, including device type, IP
                address, and operating system version.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              3. How We Use Your Data
            </h2>
            <p className="mb-4">
              We use the collected data for the following purposes:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                To provide and maintain our Service (e.g., syncing your Case
                Diary).
              </li>
              <li>To notify you about changes to our Service.</li>
              <li>
                To allow you to participate in interactive features (e.g.,
                Sharing Digital Cards via CardSphere).
              </li>
              <li>To provide customer support.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              4. Permissions & Third-Party Services
            </h2>
            <p className="mb-4">
              Our apps may require specific permissions to function correctly:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Camera/Gallery:</strong> Used in <em>CardSphere</em> for
                uploading profile photos or scanning QR codes.
              </li>
              <li>
                <strong>Contacts:</strong> Used to save digital visiting cards
                to your phone.
              </li>
              <li>
                <strong>Location (Google Maps API):</strong> Used to display
                office locations or client addresses.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              5. Data Security
            </h2>
            <p>
              The security of your data is important to us. We use commercially
              acceptable means (encryption, secure databases) to protect your
              Personal Data. However, remember that no method of transmission
              over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              6. Contact Us
            </h2>
            <p>
              If you have any questions about this Privacy Policy, you can
              contact us:
            </p>
            <ul className="mt-4 space-y-2 font-medium text-slate-900">
              <li>By Email: support@technaam.com</li>
              <li>By Founder Email: admin@technaam.com</li>
              <li>By Visiting: TechNaam HQ, Mandi Bahauddin, Pakistan.</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
