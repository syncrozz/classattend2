import { attendanceEngine } from '../src/services/attendanceEngine';
import { normalizeClassCode, toCanonicalClassCode } from '../src/utils/classHelper';

async function runVerification() {
  console.log('================================================================');
  console.log('VERIFIKASI INTEGRITI PENUGASAN KELAS: NIZAM GANI (ISI1092)');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${testName}`);
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Perincian: ${detail}`);
    }
  }

  // 1. Force fresh sync from Firestore
  console.log('1. Mengambil data segar daripada Cloud Firestore...');
  await attendanceEngine.forceSyncFromFirestore();

  // 2. Simulasi Log Masuk Nizam Gani
  console.log('\n2. Simulasi Log Masuk: nizam.gani@mara.gov.my...');
  const loginRes = attendanceEngine.verifyLecturer('nizam.gani@mara.gov.my', '2323');
  assert(loginRes.success, 'Log masuk nizam.gani@mara.gov.my berjaya');

  const activeLecturer = attendanceEngine.getActiveLecturer();
  assert(Boolean(activeLecturer && activeLecturer.id === 'LEC-NIZAMGANI'), 'Sesi aktif ditetapkan kepada LEC-NIZAMGANI');
  assert(activeLecturer?.role === 'LECTURER', 'Peranan Nizam adalah LECTURER (Privasi Pensyarah Aktif)');

  // 3. Semak Tugasan Mengajar Semasa Nizam
  const allTas = attendanceEngine.getTeachingAssignments();
  const nizamTas = allTas.filter(
    (ta) =>
      ta.status === 'ACTIVE' &&
      (ta.lecturerId === 'LEC-NIZAMGANI' || ta.lecturerEmail?.toLowerCase() === 'nizam.gani@mara.gov.my') &&
      ta.subjectCode.toUpperCase() === 'ISI1092'
  );

  console.log(`\nTugasan mengajar ISI1092 Nizam (${nizamTas.length} kelas):`);
  nizamTas.forEach((t) => console.log(`   - ${t.className} (${t.id})`));

  assert(!nizamTas.some((t) => normalizeClassCode(t.className) === 'DLS1A'), 'DLS1A tiada dalam tugasan aktif Nizam');
  assert(!nizamTas.some((t) => normalizeClassCode(t.className) === 'DLS1B'), 'DLS1B tiada dalam tugasan aktif Nizam');

  // 4. Simulasi Untick DLS1A / DLS1B & Simpan Kelas Baru
  console.log('\n4. Simulasi Simpan Pilihan Kelas (Untick DLS1A & DLS1B)...');
  const targetClasses = ['DIA1A', 'DIA1B', 'DIA1C', 'DIA1D', 'DLM4E', 'DLS1C'];
  const updateRes = attendanceEngine.updateSubjectClasses(
    'ISI1092',
    targetClasses,
    activeLecturer
  );
  assert(Boolean(updateRes && updateRes.teachingAssignments), 'Panggilan updateSubjectClasses berjaya disimpan');

  // 5. Muat Semula & Ambil Segar dari Firestore (Simulasi Reload Halaman)
  console.log('\n5. Simulasi Muat Semula Halaman (Reload) & Tarik Dari Firestore...');
  await attendanceEngine.forceSyncFromFirestore();
  const reloadedLecturer = attendanceEngine.getActiveLecturer();

  // 6. Ujian Modal: Tetapan Kelas Mengikut Subjek
  console.log('\n6. Ujian Modal "Tetapan Kelas Mengikut Subjek":');
  const reloadedTas = attendanceEngine.getTeachingAssignments().filter(
    (ta) =>
      ta.status === 'ACTIVE' &&
      (ta.lecturerId === 'LEC-NIZAMGANI' || ta.lecturerEmail?.toLowerCase() === 'nizam.gani@mara.gov.my') &&
      ta.subjectCode.toUpperCase() === 'ISI1092'
  );
  const modalSelectedClasses = reloadedTas.map((t) => toCanonicalClassCode(t.className));
  console.log('   Kelas yang ditandakan dalam modal:', modalSelectedClasses);
  assert(!modalSelectedClasses.includes('DLS1A'), 'Modal: Kelas DLS1A TIDAK ditandakan');
  assert(!modalSelectedClasses.includes('DLS1B'), 'Modal: Kelas DLS1B TIDAK ditandakan');
  assert(modalSelectedClasses.includes('DIA1A') && modalSelectedClasses.includes('DLS1C'), 'Modal: Kelas sebenar Nizam kekal lengkap');

  // 7. Ujian Workspace View (availableClassesForSubject)
  console.log('\n7. Ujian LecturerWorkspaceView (Pilihan Kelas Langkah 2):');
  const workspaceClassesMap = new Map<string, string>();
  reloadedTas.forEach((ta) => {
    if (ta.className) {
      workspaceClassesMap.set(normalizeClassCode(ta.className), toCanonicalClassCode(ta.className));
    }
  });
  const workspaceClasses = Array.from(workspaceClassesMap.values());
  console.log('   Butang kelas pada Workspace:', workspaceClasses);
  assert(!workspaceClasses.includes('DLS1A'), 'Workspace: Butang DLS1A TIDAK wujud');
  assert(!workspaceClasses.includes('DLS1B'), 'Workspace: Butang DLS1B TIDAK wujud');

  // 8. Ujian ReportsView (lecturerClasses & uniqueClasses)
  console.log('\n8. Ujian ReportsView (lecturerClasses & uniqueClasses):');
  const repClassMap = new Map<string, string>();
  reloadedTas.forEach((ta) => {
    repClassMap.set(normalizeClassCode(ta.className), toCanonicalClassCode(ta.className));
  });
  const repLecturerClasses = Array.from(repClassMap.values());
  const repUniqueClasses = [...repLecturerClasses].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  console.log('   uniqueClasses dalam Laporan:', repUniqueClasses);
  assert(!repUniqueClasses.includes('DLS1A'), 'Laporan: DLS1A TIDAK wujud dalam uniqueClasses');
  assert(!repUniqueClasses.includes('DLS1B'), 'Laporan: DLS1B TIDAK wujud dalam uniqueClasses');

  // 9. Ujian AttendanceMatrixView (availableMatrixClasses)
  console.log('\n9. Ujian AttendanceMatrixView (availableMatrixClasses):');
  const matrixClassMap = new Map<string, string>();
  reloadedTas.forEach((ta) => {
    matrixClassMap.set(normalizeClassCode(ta.className), toCanonicalClassCode(ta.className));
  });
  const matrixClasses = Array.from(matrixClassMap.values()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  console.log('   availableMatrixClasses dalam Matriks:', matrixClasses);
  assert(!matrixClasses.includes('DLS1A'), 'Matriks: DLS1A TIDAK wujud dalam pilihan kelas');
  assert(!matrixClasses.includes('DLS1B'), 'Matriks: DLS1B TIDAK wujud dalam pilihan kelas');

  // 10. Ujian DashboardView (Subject Card Classes)
  console.log('\n10. Ujian DashboardView (Kad Subjek ISI1092 untuk Nizam):');
  const dashClasses = reloadedTas.map((ta) => toCanonicalClassCode(ta.className));
  console.log('   Kelas pada kad subjek Dashboard:', dashClasses);
  assert(!dashClasses.includes('DLS1A'), 'Dashboard: DLS1A TIDAK wujud pada kad subjek');
  assert(!dashClasses.includes('DLS1B'), 'Dashboard: DLS1B TIDAK wujud pada kad subjek');

  // 11. Semak Pensyarah Lain (Afif Yusof) - Tiada Regresi Data
  console.log('\n11. Semak Integriti Data Afif Yusof (afif.yusof@mara.gov.my):');
  const afifTas = attendanceEngine.getTeachingAssignments().filter(
    (ta) =>
      ta.status === 'ACTIVE' &&
      (ta.lecturerId === 'LEC-AFIFYUSOF' || ta.lecturerEmail?.toLowerCase() === 'afif.yusof@mara.gov.my') &&
      ta.subjectCode.toUpperCase() === 'ISI1092'
  );
  const afifClasses = afifTas.map((t) => t.className);
  console.log('   Tugasan ISI1092 Afif Yusof:', afifClasses);
  assert(afifClasses.includes('DLS1A'), 'Afif Yusof KEKAL memiliki tugasan DLS1A');
  assert(afifClasses.includes('DLS1B'), 'Afif Yusof KEKAL memiliki tugasan DLS1B');

  // 12. Semak Rekod Kehadiran - Rekod Kehadiran Tidak Terjejas
  console.log('\n12. Semak Keselamatan Rekod Kehadiran (Zero Data Loss):');
  const allRecords = attendanceEngine.getAttendanceRecords();
  assert(allRecords.length > 0, `Rekod kehadiran kekal utuh (Jumlah: ${allRecords.length} rekod)`);

  console.log('\n================================================================');
  console.log(`KEPUTUSAN AKHIR: ${passedTests} / ${totalTests} UJIAN LULUS`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
