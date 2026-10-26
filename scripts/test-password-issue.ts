import { attendanceEngine } from '../src/services/attendanceEngine';

async function test() {
  console.log('1. Checking current Khairi pin:');
  const lec1 = attendanceEngine.getLecturers().find(l => l.email === 'khairi.mohd@mara.gov.my');
  console.log('Khairi in engine:', lec1?.name, 'PIN:', lec1?.pin);

  console.log('2. Updating Khairi pin to 5305:');
  const updateRes = await attendanceEngine.updateLecturerPassword(lec1!.id, '5305');
  console.log('Update result:', updateRes);

  const lec2 = attendanceEngine.getLecturers().find(l => l.email === 'khairi.mohd@mara.gov.my');
  console.log('Khairi in engine after update:', lec2?.name, 'PIN:', lec2?.pin);

  console.log('3. Verifying login with 5305:');
  const verifyRes = attendanceEngine.verifyLecturer('khairi.mohd@mara.gov.my', '5305');
  console.log('Verify 5305:', verifyRes.success, verifyRes.message);

  console.log('4. Verifying login with 5313:');
  const verify5313 = attendanceEngine.verifyLecturer('khairi.mohd@mara.gov.my', '5313');
  console.log('Verify 5313:', verify5313.success, verify5313.message);

  process.exit(0);
}

test();
