import fs from 'node:fs';

const file = JSON.parse(
  fs.readFileSync(new URL('../../accounts.json', import.meta.url), 'utf8'),
);

const staffPassword = process.env.E2E_PASSWORD || file.password;
const studentPassword = process.env.E2E_STUDENT_PASSWORD || file.studentPassword;

for (const account of Object.values(file.accounts)) {
  account.password = staffPassword;
}

file.accounts.student.password = studentPassword;

export const accounts = file.accounts;
export const roleOrder = file.roleOrder;
export { staffPassword, studentPassword };
