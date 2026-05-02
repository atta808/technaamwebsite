export default function DeleteAccountPage() {
  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "auto", fontFamily: "Arial" }}>
      <h1>Delete Account – LegalSphere Diary</h1>

      <p>If you want to delete your account and all associated data, follow the steps below:</p>

      <h2>📱 Method 1 (Inside App)</h2>
      <ol>
        <li>Open the LegalSphere Diary app</li>
        <li>Go to Settings</li>
       <li>Tap on &quot;Delete Account&quot;</li>
        <li>Confirm your request</li>
      </ol>

      <h2>📧 Method 2 (Email Request)</h2>
      <p>Email: <strong>atta.rehman4@gmail.com</strong></p>
      <p>Subject: Delete My Account</p>

      <h3>Include:</h3>
      <ul>
        <li>Your registered email</li>
        <li>Your name (optional)</li>
      </ul>

      <h2>⏳ Processing Time</h2>
      <p>Your account and all associated data will be permanently deleted within 7 days.</p>

      <h2>🗑 Data that will be deleted</h2>
      <ul>
        <li>Name</li>
        <li>Email address</li>
        <li>Case records</li>
        <li>Notes and documents</li>
        <li>Profile data</li>
      </ul>

      <h2>🔒 Data Retention</h2>
      <p>We do not retain any personal data after deletion unless required by law.</p>

      <p>
        For more details, visit our{" "}
        <a href="/privacy">Privacy Policy</a>
      </p>
    </div>
  );
}