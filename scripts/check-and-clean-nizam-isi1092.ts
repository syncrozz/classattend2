import { db } from '../src/services/firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';

async function checkAndCleanNizamISI1092() {
  if (!db) {
    console.log('No db connection');
    process.exit(1);
  }

  console.log('=== SEMAKAN & PEMBERSIHAN DOKUMEN FIRESTORE: ISI1092 & NIZAM GANI ===\n');

  // 1. Check all teaching_assignments
  const taSnap = await getDocs(collection(db, 'teaching_assignments'));
  console.log(`Jumlah dokumen teaching_assignments: ${taSnap.size}`);

  const toDeleteDocIds: string[] = [];
  const nizamActiveClasses: Set<string> = new Set();
  const afifActiveClasses: Set<string> = new Set();

  taSnap.docs.forEach((d) => {
    const data = d.data();
    const subCode = (data.subjectCode || '').toUpperCase().trim();
    const lecEmail = (data.lecturerEmail || '').toLowerCase().trim();
    const lecId = (data.lecturerId || '').toUpperCase().trim();
    const lecName = (data.lecturerName || '').toUpperCase().trim();
    const rawClass = (data.className || '').toUpperCase().trim();
    const normClass = rawClass.replace(/[^A-Z0-9]/g, '');

    const isNizam = lecEmail.includes('nizam') || lecId.includes('NIZAM') || lecName.includes('NIZAM');
    const isAfif = lecEmail.includes('afif') || lecId.includes('AFIF') || lecName.includes('AFIF');

    if (subCode === 'ISI1092') {
      console.log(`[ISI1092 DOC] ID: ${d.id} | Class: ${rawClass} | Lec: ${data.lecturerName} (${data.lecturerEmail}) | Status: ${data.status}`);

      if (isNizam) {
        // If Nizam doc has DLS1A or DLS1B, delete it immediately
        if (normClass === 'DLS1A' || normClass === 'DLS1B') {
          console.log(`  -> AKAN DIPADAM: ${d.id} (Kelas ${rawClass} bukan kelas Nizam)`);
          toDeleteDocIds.push(d.id);
        } else if (d.id.startsWith('TA_LEC-NIZAMGANI_ISI1092_')) {
          // Check if there is already a modern canonical doc with hyphen format
          const canonicalId = `TA-LEC-NIZAMGANI-ISI1092-${normClass === 'DLM4E' ? 'DLM4E' : normClass}`;
          const hasModern = taSnap.docs.some((other) => other.id === canonicalId);
          if (hasModern) {
            console.log(`  -> AKAN DIPADAM DUPLIKAT LAMA: ${d.id} (diganti oleh ${canonicalId})`);
            toDeleteDocIds.push(d.id);
          } else {
            nizamActiveClasses.add(rawClass);
          }
        } else {
          nizamActiveClasses.add(rawClass);
        }
      } else if (isAfif) {
        afifActiveClasses.add(rawClass);
      }
    }
  });

  // Delete unwanted docs
  for (const id of toDeleteDocIds) {
    console.log(`Memadam dokumen teaching_assignments: ${id}...`);
    await deleteDoc(doc(db, 'teaching_assignments', id));
  }
  console.log(`Selesai memadam ${toDeleteDocIds.length} dokumen lapuk/salah.`);

  // 2. Inspect & Clean SUB-ISI1092 in Firestore
  const subjectsSnap = await getDocs(collection(db, 'subjects'));
  for (const subDoc of subjectsSnap.docs) {
    const data = subDoc.data();
    if (subDoc.id === 'SUB-ISI1092' || (data.code || '').toUpperCase().trim() === 'ISI1092') {
      const currentSections: string[] = data.sections || [];
      console.log('\n[SUB-ISI1092 SEMASA] sections:', currentSections);

      // Clean duplicate formats like DLM_4E -> DLM4E
      const cleanedSections = Array.from(
        new Set(
          currentSections.map((s) => (s === 'DLM_4E' ? 'DLM4E' : s.trim().toUpperCase()))
        )
      );

      console.log('[SUB-ISI1092 DIKEMASKINI] sections:', cleanedSections);
      await updateDoc(doc(db, 'subjects', subDoc.id), {
        sections: cleanedSections
      });
      console.log('SUB-ISI1092 berjaya dikemas kini.');
    }
  }

  // 3. Inspect & Clean LEC-NIZAMGANI in Firestore
  const lecSnap = await getDocs(collection(db, 'lecturers'));
  for (const lDoc of lecSnap.docs) {
    const data = lDoc.data();
    if (lDoc.id === 'LEC-NIZAMGANI' || (data.email || '').toLowerCase().trim() === 'nizam.gani@mara.gov.my') {
      console.log('\n[LEC-NIZAMGANI SEMASA]');
      console.log('assignedClasses:', data.assignedClasses);
      console.log('assignedSections:', data.assignedSections);

      // Filter out DLS1A and DLS1B, normalize DLM_4E -> DLM4E
      const cleanAssigned = (data.assignedClasses || [])
        .map((c: string) => (c === 'DLM_4E' ? 'DLM4E' : c.trim().toUpperCase()))
        .filter((c: string) => c !== 'DLS1A' && c !== 'DLS1B');

      const uniqueAssigned = Array.from(new Set(cleanAssigned));

      console.log('[LEC-NIZAMGANI DIKEMASKINI] assignedClasses:', uniqueAssigned);
      await updateDoc(doc(db, 'lecturers', lDoc.id), {
        assignedClasses: uniqueAssigned,
        assignedSections: uniqueAssigned
      });
      console.log('LEC-NIZAMGANI berjaya dikemas kini.');
    }
  }

  console.log('\n=== SEMAKAN & PEMBERSIHAN SELESAI DENGAN JAYANYA ===');
  process.exit(0);
}

checkAndCleanNizamISI1092().catch((err) => {
  console.error('Ralat pembersihan:', err);
  process.exit(1);
});
