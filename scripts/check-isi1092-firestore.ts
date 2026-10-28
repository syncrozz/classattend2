import { db } from '../src/services/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

async function checkAndInspectISI1092() {
  if (!db) {
    console.log('No db connection');
    process.exit(0);
  }
  try {
    const snap = await getDocs(collection(db, 'teaching_assignments'));
    console.log('Total Firestore teaching_assignments:', snap.size);
    const isi1092Docs: any[] = [];
    const nizamDocs: any[] = [];
    
    snap.docs.forEach((d) => {
      const data = d.data();
      const subCode = (data.subjectCode || '').toUpperCase();
      const lecEmail = (data.lecturerEmail || '').toLowerCase();
      const lecId = (data.lecturerId || '');
      const lecName = (data.lecturerName || '').toUpperCase();
      
      if (subCode === 'ISI1092') {
        isi1092Docs.push({ id: d.id, ...data });
      }
      if (lecEmail.includes('nizam') || lecId.includes('NIZAM') || lecName.includes('NIZAM')) {
        nizamDocs.push({ id: d.id, ...data });
      }
    });

    console.log('\n--- ALL ISI1092 DOCUMENTS IN FIRESTORE ---');
    isi1092Docs.forEach((d) => {
      console.log(`ID: ${d.id} | Sub: ${d.subjectCode} | Class: ${d.className} | LecId: ${d.lecturerId} | Email: ${d.lecturerEmail} | Name: ${d.lecturerName} | Status: ${d.status}`);
    });

    console.log('\n--- ALL NIZAM GANI DOCUMENTS IN FIRESTORE ---');
    nizamDocs.forEach((d) => {
      console.log(`ID: ${d.id} | Sub: ${d.subjectCode} | Class: ${d.className} | LecId: ${d.lecturerId} | Email: ${d.lecturerEmail} | Status: ${d.status}`);
    });

    // Also inspect subject document SUB-ISI1092
    const subjectsSnap = await getDocs(collection(db, 'subjects'));
    subjectsSnap.docs.forEach((d) => {
      if (d.id.includes('ISI1092') || (d.data().code || '').toUpperCase() === 'ISI1092') {
        console.log('\n--- SUB-ISI1092 FIRESTORE DOC ---');
        console.log(`ID: ${d.id}`, JSON.stringify(d.data(), null, 2));
      }
    });

    // Also inspect lecturer document LEC-NIZAMGANI
    const lecSnap = await getDocs(collection(db, 'lecturers'));
    lecSnap.docs.forEach((d) => {
      const data = d.data();
      if (d.id.includes('NIZAM') || (data.email || '').includes('nizam')) {
        console.log('\n--- NIZAM GANI LECTURER FIRESTORE DOC ---');
        console.log(`ID: ${d.id}`, JSON.stringify(data, null, 2));
      }
    });

  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

checkAndInspectISI1092();
