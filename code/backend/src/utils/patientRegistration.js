const REGISTRATION_PREFIX = "ORT";

function getCurrentRegistrationYear() {
  return new Date().getFullYear();
}

function formatPatientRegistrationNumber(year, sequence) {
  return `${REGISTRATION_PREFIX}-${year}-${String(sequence).padStart(4, "0")}`;
}

function parsePatientRegistrationNumber(value) {
  const match = String(value || "").match(/^ORT-(\d{4})-(\d{4})$/);
  if (!match) return null;

  return {
    year: Number(match[1]),
    sequence: Number(match[2]),
  };
}

async function getNextPatientRegistrationNumber(prisma, year = getCurrentRegistrationYear()) {
  const patients = await prisma.patient.findMany({
    where: {
      patientId: {
        startsWith: `${REGISTRATION_PREFIX}-${year}-`,
      },
    },
    select: {
      patientId: true,
    },
  });

  const maxSequence = patients.reduce((max, patient) => {
    const parsed = parsePatientRegistrationNumber(patient.patientId);
    if (!parsed || parsed.year !== year) return max;
    return Math.max(max, parsed.sequence);
  }, 0);

  return formatPatientRegistrationNumber(year, maxSequence + 1);
}

module.exports = {
  formatPatientRegistrationNumber,
  getCurrentRegistrationYear,
  getNextPatientRegistrationNumber,
  parsePatientRegistrationNumber,
};
