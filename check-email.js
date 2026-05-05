const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAsJ9KmjBLvVRCQBp7pQLFe14EhLVEZVFI",
  authDomain: "join-b7de5.firebaseapp.com",
  projectId: "join-b7de5",
  storageBucket: "join-b7de5.firebasestorage.app",
  messagingSenderId: "370763835129",
  appId: "1:370763835129:web:9f8eb2e7d0de6f7c849c8e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkEmail() {
  try {
    // Search in users collection
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', 'robert@müller.de'));
    const querySnapshot = await getDocs(q);
    
    console.log('=== Users Collection ===');
    if (querySnapshot.empty) {
      console.log('Keine Einträge in users gefunden');
    } else {
      querySnapshot.forEach(doc => {
        console.log('Document:', doc.id);
        console.log('Data:', JSON.stringify(doc.data(), null, 2));
      });
    }
    
    // Also search in contacts collection
    const contactsRef = collection(db, 'contacts');
    const q2 = query(contactsRef, where('email', '==', 'robert@müller.de'));
    const contactSnapshot = await getDocs(q2);
    
    console.log('\n=== Contacts Collection ===');
    if (contactSnapshot.empty) {
      console.log('Keine Einträge in contacts gefunden');
    } else {
      contactSnapshot.forEach(doc => {
        console.log('Document:', doc.id);
        console.log('Data:', JSON.stringify(doc.data(), null, 2));
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkEmail();
