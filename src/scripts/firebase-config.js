// ============================================================
//  Firebase settings for the live chat.
//  Fill these in from: Firebase console -> Project settings ->
//  Your apps -> Web app -> "firebaseConfig".
//  These values are safe to publish; the security rules protect the data.
//  While apiKey is empty, the chat bubble is hidden.
// ============================================================
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  appId: '',
}

// Google accounts allowed to open admin.html and reply to customers.
// Must match the list inside firestore.rules.
export const adminEmails = ['quangthong3005@gmail.com']
