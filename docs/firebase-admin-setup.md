# Firebase setup

1. Create a Firebase project and enable Email/Password and Anonymous Authentication.
2. Create a Firestore database and deploy `firestore.rules`.
3. Copy the Firebase web app values into the `VITE_FIREBASE_*` variables in a local `.env` file. These are client configuration values; never add Firebase Admin service-account JSON, private keys, or the Gemini key to the frontend.
4. For an owner/admin view, set the Firebase custom claim `admin: true` from a server-side trusted environment using the Firebase Admin SDK. Do not decide admin access from an email address in React.
5. A server-side admin tool can list `users` and their metadata after verifying the caller's Firebase ID token and admin claim. Do not expose that query to normal users.

Organization API routes still use the existing MongoDB/JWT contract. Firebase provides the browser authentication/profile layer and does not replace the existing risk workflow in this incremental integration.

Citizen scans are stored at `users/{uid}/scans/{scanId}` with only `userId`, `timestamp`, and `riskClassification`. Raw messages and screenshot files are never written to Firestore.
