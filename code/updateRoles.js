const fs = require('fs');
const files = [
  'orthorecords/src/pages/PatientsPage.jsx',
  'orthorecords/src/pages/PatientDetailPage.jsx',
  'orthorecords/src/pages/NewPatientPage.jsx',
  'orthorecords/src/pages/DashboardPage.jsx',
  'orthorecords/src/pages/AppointmentsPage.jsx'
];
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const replaced = content.replace(/user\?\.role === 'CLINICIAN' \|\| user\?\.role === 'ADMIN' \|\| user\?\.role === 'DOCTOR'/g, "user?.role === 'STAFF' || user?.role === 'ADMIN'");
  fs.writeFileSync(f, replaced);
});
console.log("Roles updated.");
