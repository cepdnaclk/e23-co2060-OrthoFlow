const express = require("express");
const prisma = require("../prismaClient");
const { actor } = require('../utils/patientAccess');
const { validateCaseHistory } = require('../utils/caseHistory');
const { authenticateToken, authorizeRoles } = require("./authRoutes");
const { getNextPatientRegistrationNumber, parsePatientRegistrationNumber } = require("../utils/patientRegistration");

const router = express.Router();

router.use(authenticateToken);

router.get("/next-registration-number", authorizeRoles("STAFF", "ADMIN"), async (req, res) => {
  try {
    const registrationNumber = await getNextPatientRegistrationNumber(prisma);
    res.json({ registrationNumber });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/register", authorizeRoles("STAFF", "ADMIN"), async (req, res) => {
  try {
    const data = req.body;
    const caseHistory = validateCaseHistory(data.caseHistory ?? {});
    if (Object.keys(caseHistory.errors).length) {
      return res.status(400).json({ message: 'Please correct the case history fields.', fields: caseHistory.errors });
    }
    
    const s = (val) => (val === "" ? null : val);
    const patientId = await getNextPatientRegistrationNumber(prisma);

    const patient = await prisma.patient.create({
      data: {
        name: data.name || data.fullName,
        patientId,
        dob: data.dob ? new Date(data.dob) : null,
        gender: s(data.gender),
        phone: s(data.phone),
        email: s(data.email),
        address: s(data.address),
        guardian: s(data.guardian || data.guardianName),
        guardianPhone: s(data.guardianPhone),
        referredBy: s(data.referredBy),
        status: data.status || "Assessment",
        chiefComplaint: s(data.chiefComplaint),
        medicalHistory: s(data.medicalHistory),
        dentalHistory: s(data.dentalHistory),
        caseHistory: caseHistory.value,
        allergies: s(data.allergies),
        notes: s(data.notes),
        initials: (data.name || data.fullName || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase(),
        historyLogs: {
          create: {
            action: "Patient Registered",
            ...await actor(req.user),
            details: "Initial record created",
          }
        }
      }
    });
    
    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", authorizeRoles("STAFF", "STUDENT", "ADMIN"), async (req, res) => {
  try {
    if (req.user.role === "STUDENT") {
      const accesses = await prisma.patientAccess.findMany({
        where: { userId: req.user.id },
        select: { patientId: true }
      });
      const patientIds = accesses.map(a => a.patientId);
      
      const patients = await prisma.patient.findMany({
        where: { id: { in: patientIds }, archivedAt: null },
        orderBy: { updatedAt: 'desc' }
      });
      return res.json(patients);
    }

    const patients = await prisma.patient.findMany({
      where: req.query.archived === 'true' ? { archivedAt: { not: null } } : { archivedAt: null },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/history/all", authorizeRoles("STAFF", "ADMIN"), async (req, res) => {
  try {
    const logs = await prisma.historyLog.findMany({
      orderBy: { timestamp: 'desc' },
      include: {
        patient: {
          select: { name: true, patientId: true }
        }
      }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", authorizeRoles("STAFF", "STUDENT", "ADMIN"), async (req, res) => {
  try {
    if (req.user.role === "STUDENT") {
      const access = await prisma.patientAccess.findFirst({
        where: { userId: req.user.id, patientId: req.params.id }
      });
      if (!access) return res.status(403).json({ message: "Access denied" });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        appointments: { orderBy: { date: 'asc' } },
        radiographs: { orderBy: { uploadDate: 'desc' } },
        historyLogs: { orderBy: { timestamp: 'desc' } }
      }
    });
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", authorizeRoles("STAFF", "ADMIN"), async (req, res) => {
  try {
    const data = req.body;
    const s = (val) => (val === "" ? null : val);
    
    const updateData = {};
    const previous = await prisma.patient.findUnique({ where: { id: req.params.id } });
    if (!previous) return res.status(404).json({ message: 'Patient not found' });
    if (previous.archivedAt) return res.status(409).json({ message: 'Restore the patient before editing' });
    if (data.caseHistory !== undefined) {
      const caseHistory = validateCaseHistory(data.caseHistory);
      if (Object.keys(caseHistory.errors).length) {
        return res.status(400).json({ message: 'Please correct the case history fields.', fields: caseHistory.errors });
      }
      updateData.caseHistory = caseHistory.value;
    }
    if (data.name || data.fullName) updateData.name = data.name || data.fullName;
    if (data.patientId || data.regNum) {
      const patientId = data.patientId || data.regNum;
      if (!parsePatientRegistrationNumber(patientId)) {
        return res.status(400).json({ message: "Registration number must use the format ORT-YYYY-0001" });
      }
      updateData.patientId = patientId;
    }
    if (data.dob !== undefined) updateData.dob = data.dob ? new Date(data.dob) : null;
    if (data.gender !== undefined) updateData.gender = s(data.gender);
    if (data.phone !== undefined) updateData.phone = s(data.phone);
    if (data.email !== undefined) updateData.email = s(data.email);
    if (data.address !== undefined) updateData.address = s(data.address);
    if (data.guardian !== undefined || data.guardianName !== undefined) updateData.guardian = s(data.guardian || data.guardianName);
    if (data.guardianPhone !== undefined) updateData.guardianPhone = s(data.guardianPhone);
    if (data.referredBy !== undefined) updateData.referredBy = s(data.referredBy);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.chiefComplaint !== undefined) updateData.chiefComplaint = s(data.chiefComplaint);
    if (data.medicalHistory !== undefined) updateData.medicalHistory = s(data.medicalHistory);
    if (data.dentalHistory !== undefined) updateData.dentalHistory = s(data.dentalHistory);
    if (data.allergies !== undefined) updateData.allergies = s(data.allergies);
    if (data.notes !== undefined) updateData.notes = s(data.notes);

    if (updateData.name) {
      updateData.initials = updateData.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    }

    const patient = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(2060)`;
      const current = await tx.patient.findUnique({ where: { id: req.params.id } });
      if (!current || current.archivedAt) throw new Error('Patient is unavailable for editing');
      return tx.patient.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        historyLogs: { create: {
          action: "Patient Updated",
          ...await actor(req.user, tx),
          changes: JSON.parse(JSON.stringify({ before: Object.fromEntries(Object.keys(updateData).map(key => [key, current[key]])), after: updateData })),
          details: data.caseHistory !== undefined ? `Record and orthodontic case history updated by user ${req.user.id}` : "Record modified by user"
        } }
      }
      });
    });

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/archive", authorizeRoles("STAFF", "ADMIN"), async (req, res) => {
  try {
    const id = req.params.id;
    const restore = req.body.restore === true;
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    if (!restore && !reason) return res.status(400).json({ message: 'An archive reason is required' });
    const patient = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(2060)`;
      const updated = await tx.patient.update({ where: { id }, data: { archivedAt: restore ? null : new Date(), archiveReason: restore ? null : reason } });
      if (!restore) {
        await tx.appointment.updateMany({ where: { patientId: id, status: { in: ['Scheduled', 'Confirmed'] } }, data: { status: 'Cancelled', reminderStatus: 'Not required', reminderLastMessage: 'Patient archived', patientEmailStatus: 'Not required', clinicianEmailStatus: 'Not required', patientNotificationStatus: 'Not required', clinicianNotificationStatus: 'Not required' } });
        await tx.notification.updateMany({ where: { patientId: id }, data: { read: true, readAt: new Date() } });
      }
      await tx.historyLog.create({ data: { patientId: id, ...await actor(req.user, tx), action: restore ? 'Patient Restored' : 'Patient Archived', details: restore ? 'Restored; cancelled appointments remain cancelled' : reason } });
      return updated;
    });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authorizeRoles('STAFF', 'ADMIN'), (req, res) => res.status(405).json({ message: 'Archive patient records instead of permanently deleting them' }));

module.exports = router;
