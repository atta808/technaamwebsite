export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-2xl p-8">
        
        {/* Title */}
        <h1 className="text-3xl font-bold text-blue-700 mb-4">
          Delete Account – LegalSphere Diary
        </h1>

        <p className="text-gray-600 mb-6">
          If you want to delete your account and all associated data, follow the steps below.
        </p>

        {/* Method 1 */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            📱 Method 1 (Inside App)
          </h2>
          <ol className="list-decimal ml-6 text-gray-700 space-y-1">
            <li>Open the LegalSphere Diary app</li>
            <li>Go to Settings</li>
            <li>Tap on &quot;Delete Account&quot;</li>
            <li>Confirm your request</li>
          </ol>
        </div>

        {/* Method 2 */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            📧 Method 2 (Email Request)
          </h2>
          <p className="text-gray-700">
            Email:{" "}
            <span className="font-semibold text-blue-600">
              atta.rehman4@gmail.com
            </span>
          </p>
          <p className="text-gray-700">Subject: Delete My Account</p>

          <ul className="list-disc ml-6 mt-2 text-gray-700">
            <li>Your registered email</li>
            <li>Your name (optional)</li>
          </ul>
        </div>

        {/* Processing */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            ⏳ Processing Time
          </h2>
          <p className="text-gray-700">
            Your account and all associated data will be permanently deleted within 7 days.
          </p>
        </div>

        {/* Data Deleted */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            🗑 Data that will be deleted
          </h2>
          <ul className="list-disc ml-6 text-gray-700">
            <li>Name</li>
            <li>Email address</li>
            <li>Case records</li>
            <li>Notes and documents</li>
            <li>Profile data</li>
          </ul>
        </div>

        {/* Retention */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            🔒 Data Retention
          </h2>
          <p className="text-gray-700">
            We do not retain any personal data after deletion unless required by law.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 mt-6 text-sm text-gray-500">
          For more details, visit our{" "}
          <a href="/privacy" className="text-blue-600 underline">
            Privacy Policy
          </a>
        </div>

      </div>
    </div>
  );
}