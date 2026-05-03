const express = require("express");
const prisma = require("../prismaClient");
const { authenticateToken } = require("./authRoutes");

const router = express.Router();

router.use(authenticateToken);

router.post("/register", async (req, res) => {
  try {
    const data = req.body;
    
    const s = (val) => (val === "" ? null : val);

    const patient = await prisma.patient.create({
      data: {
        name: data.name || data.fullName,
        patientId: data.patientId || data.regNum || `ORT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
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
        allergies: s(data.allergies),
        notes: s(data.notes),
        initials: (data.name || data.fullName || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase(),
        historyLogs: {
          create: {
            action: "Patient Registered",
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

router.get("/", async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: { updatedAt: 'desc' }
    });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/history/all", async (req, res) => {
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

router.get("/:id", async (req, res) => {
  try {
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

router.put("/:id", async (req, res) => {
  try {
    const data = req.body;
    const s = (val) => (val === "" ? null : val);
    
    const updateData = {};
    if (data.name || data.fullName) updateData.name = data.name || data.fullName;
    if (data.patientId || data.regNum) updateData.patientId = data.patientId || data.regNum;
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

    const patient = await prisma.patient.update({
      where: { id: req.params.id },
      data: updateData
    });
    
    await prisma.historyLog.create({
      data: {
        patientId: patient.id,
        action: "Patient Updated",
        details: "Record modified by user"
      }
    });

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    
    // Delete associated records first
    await prisma.historyLog.deleteMany({ where: { patientId: id } });
    await prisma.appointment.deleteMany({ where: { patientId: id } });
    await prisma.radiograph.deleteMany({ where: { patientId: id } });
    
    // Delete patient
    await prisma.patient.delete({ where: { id } });
    
    res.json({ success: true, message: "Patient deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
