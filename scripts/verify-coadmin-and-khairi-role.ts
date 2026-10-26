import { attendanceEngine } from '../src/services/attendanceEngine';
import { INITIAL_LECTURERS } from '../src/data/mockData';

console.log('=== VERIFYING KHAIRI DEMOTION AND CO-ADMIN SETTINGS ===\n');

// 1. Verify mockData initial state
const khairiMock = INITIAL_LECTURERS.find(
  (l) => l.email.toLowerCase() === 'khairi.mohd@mara.gov.my' || l.id === 'LEC-KHAIRI'
);
if (!khairiMock) {
  console.error('FAIL: khairiMock not found in INITIAL_LECTURERS');
  process.exit(1);
}
if (khairiMock.role !== 'LECTURER') {
  console.error(`FAIL: khairiMock.role expected 'LECTURER' but got '${khairiMock.role}'`);
  process.exit(1);
}
console.log('✓ PASS 1: INITIAL_LECTURERS has khairi.mohd@mara.gov.my as role LECTURER.');

// 2. Verify attendanceEngine.getLecturers()
const lecturers = attendanceEngine.getLecturers();
const khairiEngine = lecturers.find(
  (l) => l.email.toLowerCase() === 'khairi.mohd@mara.gov.my' || l.id === 'LEC-KHAIRI'
);
if (!khairiEngine) {
  console.error('FAIL: khairiEngine not found in attendanceEngine.getLecturers()');
  process.exit(1);
}
if (khairiEngine.role !== 'LECTURER') {
  console.error(`FAIL: khairiEngine.role expected 'LECTURER' but got '${khairiEngine.role}'`);
  process.exit(1);
}
console.log(`✓ PASS 2: attendanceEngine.getLecturers() has Khairi as role: ${khairiEngine.role}`);

// 3. Verify co-admins list does NOT contain khairi by default
const initialCoAdmins = attendanceEngine.getCoAdminEmails();
if (initialCoAdmins.includes('khairi.mohd@mara.gov.my')) {
  console.error('FAIL: khairi.mohd@mara.gov.my should NOT be in coAdmins by default');
  process.exit(1);
}
console.log('✓ PASS 3: initialCoAdmins does not contain khairi.mohd@mara.gov.my.');

// 4. Test addCoAdminEmail for a test lecturer or co-admin
const testEmail = 'norazlina@mara.gov.my';
const addResult = attendanceEngine.addCoAdminEmail(testEmail);
if (!addResult.success) {
  console.error('FAIL: Failed to add co-admin email:', addResult.message);
  process.exit(1);
}
const coAdminsAfterAdd = attendanceEngine.getCoAdminEmails();
if (!coAdminsAfterAdd.includes(testEmail)) {
  console.error('FAIL: testEmail not found in getCoAdminEmails after add');
  process.exit(1);
}
console.log(`✓ PASS 4: Successfully added ${testEmail} as Co-Admin: ${addResult.message}`);

// 5. Test removeCoAdminEmail
const removeResult = attendanceEngine.removeCoAdminEmail(testEmail);
if (!removeResult.success) {
  console.error('FAIL: Failed to remove co-admin email:', removeResult.message);
  process.exit(1);
}
const coAdminsAfterRemove = attendanceEngine.getCoAdminEmails();
if (coAdminsAfterRemove.includes(testEmail)) {
  console.error('FAIL: testEmail still present after remove');
  process.exit(1);
}
console.log(`✓ PASS 5: Successfully removed ${testEmail} from Co-Admin: ${removeResult.message}`);

// 6. Verify verifyLecturer for Khairi returns LECTURER role
const verifyRes = attendanceEngine.verifyLecturer('khairi.mohd@mara.gov.my', khairiEngine.pin || '1234');
if (!verifyRes.success || !verifyRes.lecturer) {
  console.error('FAIL: verifyLecturer failed for Khairi:', verifyRes.message);
  process.exit(1);
}
if (verifyRes.lecturer.role !== 'LECTURER') {
  console.error(`FAIL: verifyLecturer returned role '${verifyRes.lecturer.role}' for Khairi, expected 'LECTURER'`);
  process.exit(1);
}
console.log(`✓ PASS 6: verifyLecturer for Khairi strictly returns role: ${verifyRes.lecturer.role}`);

console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
process.exit(0);
