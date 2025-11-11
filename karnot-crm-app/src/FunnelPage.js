rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Only allow logged-in users to access the data.
    // It checks this for EVERY read, write, update, or delete.
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
