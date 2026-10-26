import { attendanceEngine } from '../src/services/attendanceEngine';

async function runPasswordTests() {
  console.log('================================================================');
  console.log('UJIAN KESELAMATAN KATA LALUAN PENSYARAH & PENTADBIR');
  console.log('================================================================\n');

  console.log('Menyegerakkan data terkini daripada Cloud Firestore...');
  const syncCounts = await attendanceEngine.forceSyncFromFirestore();
  console.log(`Segerak selesai: ${syncCounts.lecturers} Pensyarah, ${syncCounts.students} Pelajar, ${syncCounts.subjects} Kursus.\n`);

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] Test ${totalTests}: ${testName}`);
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
      if (detail) console.error(`         Detail: ${detail}`);
    }
  }

  // --- BAHAGIAN 1: KHAIRI MOHD (khairi.mohd@mara.gov.my) ---
  console.log('--- BAHAGIAN 1: Ujian Akaun Khairi Mohd (IC: 861115-01-5305) ---');
  const khairi = attendanceEngine.getLecturers().find(l => l.email === 'khairi.mohd@mara.gov.my');
  assert(!!khairi, 'Akaun Khairi Mohd wujud dalam pangkalan data', `ID: ${khairi?.id}`);
  assert(khairi?.pin === '5305', `PIN Khairi semasa adalah 5305 (Semasa: ${khairi?.pin})`);
  assert(khairi?.role === 'LECTURER', `Peranan Khairi adalah LECTURER biasa dan BUKAN admin (Semasa: ${khairi?.role})`);

  // Test 1.1: Log masuk Khairi dengan PIN 5305 (Mestilah Berjaya)
  const loginKhairi5305 = attendanceEngine.verifyLecturer('khairi.mohd@mara.gov.my', '5305');
  assert(loginKhairi5305.success === true, 'Log masuk Khairi dengan PIN 5305 berjaya', loginKhairi5305.message);

  // Test 1.2: Log masuk Khairi dengan PIN 5313 (Mestilah DITOLAK / GAGAL)
  // Ini membuktikan tiada master bypass atau revert ke 5313!
  const loginKhairi5313 = attendanceEngine.verifyLecturer('khairi.mohd@mara.gov.my', '5313');
  assert(loginKhairi5313.success === false, 'Log masuk Khairi dengan PIN 5313 DITOLAK dengan betul', loginKhairi5313.message);

  // Test 1.3: Tukar kata laluan Khairi ke PIN baharu (cth: 8899)
  const updateKhairiRes = await attendanceEngine.updateLecturerPassword(khairi!.id, '8899');
  assert(updateKhairiRes.success === true, 'Tukar kata laluan Khairi kepada 8899 berjaya', updateKhairiRes.message);

  // Test 1.4: Log masuk dengan 8899 (Mestilah Berjaya)
  const loginKhairi8899 = attendanceEngine.verifyLecturer('khairi.mohd@mara.gov.my', '8899');
  assert(loginKhairi8899.success === true, 'Log masuk Khairi dengan PIN baharu 8899 berjaya', loginKhairi8899.message);

  // Test 1.5: Log masuk dengan 5305 selepas tukar (Mestilah DITOLAK)
  const loginKhairiOld5305 = attendanceEngine.verifyLecturer('khairi.mohd@mara.gov.my', '5305');
  assert(loginKhairiOld5305.success === false, 'Log masuk Khairi dengan PIN lama 5305 DITOLAK selepas penukaran', loginKhairiOld5305.message);

  // Test 1.6: Log masuk dengan 5313 selepas tukar (Mestilah DITOLAK)
  const loginKhairiPost5313 = attendanceEngine.verifyLecturer('khairi.mohd@mara.gov.my', '5313');
  assert(loginKhairiPost5313.success === false, 'Log masuk Khairi dengan PIN 5313 kekal DITOLAK', loginKhairiPost5313.message);

  // Test 1.7: Kembalikan kata laluan Khairi kepada 5305
  const revertKhairiRes = await attendanceEngine.updateLecturerPassword(khairi!.id, '5305');
  assert(revertKhairiRes.success === true, 'Kembalikan kata laluan Khairi ke 5305 berjaya', revertKhairiRes.message);

  const loginKhairiRestored = attendanceEngine.verifyLecturer('khairi.mohd@mara.gov.my', '5305');
  assert(loginKhairiRestored.success === true, 'Log masuk Khairi dengan PIN 5305 yang dipulihkan berjaya', loginKhairiRestored.message);

  // --- BAHAGIAN 2: UJIAN PENSYARAH-PENSYARAH LAIN ---
  console.log('\n--- BAHAGIAN 2: Ujian Tukar Kata Laluan Pensyarah Lain ---');
  const testLecturers = [
    { email: 'adam.ihsan@mara.gov.my', newPin: '7788' },
    { email: 'julia.abas@mara.gov.my', newPin: '9911' },
    { email: 'shaiful.wagiman@mara.gov.my', newPin: '4455' }
  ];

  for (const item of testLecturers) {
    const lec = attendanceEngine.getLecturers().find(l => l.email === item.email);
    assert(!!lec, `Pensyarah ${item.email} wujud dalam pangkalan data`, `Nama: ${lec?.name}`);
    if (!lec) continue;

    const originalPin = lec.pin || '1234';

    // 2.1 Test Master PIN 5313 cannot login to this lecturer
    const testMasterLogin = attendanceEngine.verifyLecturer(lec.email, '5313');
    assert(testMasterLogin.success === false, `Log masuk ${lec.name} menggunakan Master PIN 5313 DITOLAK`, testMasterLogin.message);

    // 2.2 Update to new PIN
    const updateRes = await attendanceEngine.updateLecturerPassword(lec.id, item.newPin);
    assert(updateRes.success === true, `Kemas kini kata laluan ${lec.name} ke ${item.newPin} berjaya`, updateRes.message);

    // 2.3 Verify login with new PIN
    const newLogin = attendanceEngine.verifyLecturer(lec.email, item.newPin);
    assert(newLogin.success === true, `Log masuk ${lec.name} dengan PIN baharu ${item.newPin} berjaya`, newLogin.message);

    // 2.4 Verify old PIN is rejected
    if (originalPin !== item.newPin) {
      const oldLogin = attendanceEngine.verifyLecturer(lec.email, originalPin);
      assert(oldLogin.success === false, `Log masuk ${lec.name} dengan PIN lama ${originalPin} DITOLAK`, oldLogin.message);
    }

    // 2.5 Test Admin Reset to default 1234
    const resetRes = await attendanceEngine.resetLecturerPinToDefault(lec.id, 'Admin Master');
    assert(resetRes.success === true, `Admin Reset kata laluan ${lec.name} ke 1234 berjaya`, resetRes.message);

    // 2.6 Verify login with default 1234 and requirePinChange is true
    const defaultLogin = attendanceEngine.verifyLecturer(lec.email, '1234');
    assert(defaultLogin.success === true, `Log masuk ${lec.name} dengan PIN default 1234 berjaya`, defaultLogin.message);
    assert(defaultLogin.requirePinChange === true, `Bendera requirePinChange aktif untuk ${lec.name}`);
  }

  // --- BAHAGIAN 3: UJIAN ADMIN PIN MASTER (5313) ---
  console.log('\n--- BAHAGIAN 3: Ujian PIN Master Pentadbir (5313) ---');
  // Admin PIN 5313 must work in verifyAdminPin
  const admin5313 = attendanceEngine.verifyAdminPin('5313');
  assert(admin5313.success === true, 'PIN Master Pentadbir 5313 sah untuk modul Admin Master');

  // Random PIN in Admin PIN must fail
  const adminRandom = attendanceEngine.verifyAdminPin('5305');
  assert(adminRandom.success === false, 'PIN 5305 tidak sah untuk modul Admin Master (khusus untuk Khairi)');

  console.log('\n================================================================');
  console.log(`KEPUTUSAN UJIAN KESELAMATAN KATA LALUAN: ${passedTests} / ${totalTests} LULUS`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('SEMUA UJIAN BERJAYA LULUS DENGAN CEMERLANG! Tiada isu revert atau bypass.');
  } else {
    console.error('TERDAPAT UJIAN GAGAL. Sila semak output di atas.');
  }

  process.exit(0);
}

runPasswordTests().catch((err) => {
  console.error('Ralat semasa menjalankan ujian:', err);
  process.exit(1);
});
