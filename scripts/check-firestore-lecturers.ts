import { db } from '../src/services/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function check() {
  if (!db) {
    console.log('No db connection');
    process.exit(0);
  }
  try {
    const snap = await getDocs(collection(db, 'lecturers'));
    console.log('Firestore lecturers count:', snap.size);
    snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`Doc ID: ${doc.id}, Name: ${data.name}, Email: ${data.email}, PIN: ${data.pin}, Role: ${data.role}`);
    });
  } catch (err) {
    console.error('Error reading firestore:', err);
  }
  process.exit(0);
}

check();
