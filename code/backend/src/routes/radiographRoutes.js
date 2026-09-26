const express = require("express");
const multer = require("multer");
const path = require("path");
const { randomUUID } = require('node:crypto');
const prisma = require("../prismaClient");
const { canReadPatient, actor } = require('../utils/patientAccess');
const { authenticateToken, authorizeRoles } = require("./authRoutes");
const { saveFile, deleteFile } = require('../services/storageService');

const router = express.Router();
const imageTypes = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1, fields: 4 },
  fileFilter: (req, file, cb) => cb(null, Object.hasOwn(imageTypes, file.mimetype)),
});

router.use(authenticateToken);

router.post("/upload/:patientId", authorizeRoles("STAFF", "ADMIN"), async (req, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { id: req.params.patientId } });
    if (!patient || patient.archivedAt) return res.status(409).json({ message: 'Select an active patient' });
    next();
  } catch (error) { next(error); }
}, upload.single("image"), async (req, res, next) => {
  let written;
  let committed = false;
  try {
    const { patientId } = req.params;
    const { description, category } = req.body;
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const filename = randomUUID() + imageTypes[req.file.mimetype];
    await saveFile('uploads', filename, req.file.buffer, req.file.mimetype);
    written = filename;
    const radiograph = await prisma.$transaction(async tx => {
      const saved = await tx.radiograph.create({
        data: { patientId, category: category || "RADIOGRAPH", fileUrl: '/uploads/' + filename, description: description || "Uploaded Image" },
      });
      await tx.historyLog.create({
        data: {
          patientId, action: category === "CASE_HISTORY" ? "Case History Uploaded" : "Radiograph Uploaded",
          ...await actor(req.user, tx), details: 'Uploaded a new image: ' + (description || "No description"),
        },
      });
      return saved;
    });
    committed = true;
    res.status(201).json(radiograph);
  } catch (error) {
    if (written && !committed) await deleteFile('uploads', written).catch(() => {});
    next(error);
  }
});

router.get("/patient/:patientId", authorizeRoles("STAFF", "STUDENT", "ADMIN"), async (req, res, next) => {
  try {
    if (!await canReadPatient(req.user, req.params.patientId)) return res.status(403).json({ message: 'Access denied' });
    const radiographs = await prisma.radiograph.findMany({
      where: { patientId: req.params.patientId }, orderBy: { uploadDate: 'desc' },
    });
    res.json(radiographs);
  } catch (error) { next(error); }
});

router.delete("/:id", authorizeRoles("STAFF", "ADMIN"), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const radiograph = await prisma.radiograph.findUnique({ where: { id } });
    if (!radiograph) return res.status(404).json({ error: "Image not found" });
    const patient = await prisma.patient.findUnique({ where: { id: radiograph.patientId } });
    if (!patient || patient.archivedAt) return res.status(409).json({ message: 'Restore the patient before modifying media' });

    // A storage failure keeps the record available so deletion can be retried.
    await deleteFile('uploads', path.basename(radiograph.fileUrl));
    await prisma.$transaction(async tx => {
      await tx.radiograph.delete({ where: { id } });
      await tx.historyLog.create({
        data: {
          patientId: radiograph.patientId,
          action: radiograph.category === "CASE_HISTORY" ? "Case History Deleted" : "Radiograph Deleted",
          ...await actor(req.user, tx), details: 'Deleted image: ' + (radiograph.description || "No description"),
        },
      });
    });
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.use((error, req, res, next) => {
  const status = error.status || (error instanceof multer.MulterError ? 400 : 500);
  res.status(status).json({ message: status === 500 ? 'Could not process image' : error.message });
});
module.exports = router;
