const fs = require('fs');
const path = require('path');

const files = [
  'server/routes/signupRoutes.js',
  'server/routes/authRoutes.js',
  'server/services/dbService.js',
  'server/index.js'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // getVerificationSession
  content = content.replace(/const existing = getVerificationSession\(/g, 'const existing = await getVerificationSession(');
  content = content.replace(/const session = getVerificationSession\(/g, 'const session = await getVerificationSession(');
  
  // setVerificationSession
  content = content.replace(/setVerificationSession\(/g, 'await setVerificationSession(');
  // Revert imports that got an await by mistake
  content = content.replace(/await setVerificationSession \} from/g, 'setVerificationSession } from');
  content = content.replace(/getVerificationSession, await setVerificationSession/g, 'getVerificationSession, setVerificationSession');
  content = content.replace(/await setVerificationSession, deleteVerificationSession/g, 'setVerificationSession, deleteVerificationSession');

  // getPasswordResetSession
  content = content.replace(/const existing = getPasswordResetSession\(/g, 'const existing = await getPasswordResetSession(');
  content = content.replace(/const session = getPasswordResetSession\(/g, 'const session = await getPasswordResetSession(');
  
  // setPasswordResetSession
  content = content.replace(/setPasswordResetSession\(/g, 'await setPasswordResetSession(');
  content = content.replace(/getPasswordResetSession, await setPasswordResetSession/g, 'getPasswordResetSession, setPasswordResetSession');
  
  // deletePasswordResetSession
  content = content.replace(/deletePasswordResetSession\(/g, 'await deletePasswordResetSession(');
  content = content.replace(/await setPasswordResetSession, await deletePasswordResetSession/g, 'setPasswordResetSession, deletePasswordResetSession');
  content = content.replace(/await deletePasswordResetSession \}/g, 'deletePasswordResetSession }');
  
  // deleteVerificationSession
  content = content.replace(/deleteVerificationSession\(/g, 'await deleteVerificationSession(');
  
  fs.writeFileSync(file, content);
  console.log(`Refactored ${file}`);
}
