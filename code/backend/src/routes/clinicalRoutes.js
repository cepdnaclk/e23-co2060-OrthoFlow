const express = require('express');
const multer = require('multer');
const path = require('node:path');
const { saveFile, readFile, deleteFile } = require('../services/storageService');
const { randomUUID } = require('node:crypto');
const prisma = require('../prismaClient');
const { authenticateToken, authorizeRoles } = require('./authRoutes');
const { canReadPatient, actor, httpError } = require('../utils/patientAccess');
const definitions = require('../../../shared/clinicalFields.json');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 4 } });
router.use(authenticateToken);
router.use('/:patientId', async (req, res, next) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.patientId)) throw httpError(400, 'Invalid patient ID');
    if (!await canReadPatient(req.user, req.params.patientId)) throw httpError(403, 'Access denied');
    next();
  } catch (error) { next(error); }
});
const publicRecord = record => { const { documentFile, ...rest } = record; return { ...rest, hasDocument: Boolean(documentFile) }; };
router.get('/:patientId', async (req, res, next) => {
  try { res.json((await prisma.clinicalRecord.findMany({ where: { patientId: req.params.patientId }, orderBy: { createdAt: 'desc' } })).map(publicRecord)); }
  catch (error) { next(error); }
});
router.post('/:patientId', authorizeRoles('STAFF', 'ADMIN'), upload.single('document'), async (req, res, next) => {
  let written;
  let committed = false;
  try {
    const payload = req.body.payload ? JSON.parse(req.body.payload) : req.body;
    const definition = definitions.find(item => item.kind === payload.kind);
    if (!definition || !payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) throw httpError(400, 'Invalid clinical record');
    const data = {};
    for (const field of definition.fields) {
      const value = payload.data[field.key];
      if (value !== undefined && typeof value !== 'string') throw httpError(400, `Invalid ${field.label}`);
      const text = (value || '').trim();
      if (field.required && !text) throw httpError(400, `${field.label} is required`);
      if (text.length > 10000) throw httpError(400, `${field.label} is too long`);
      if (text && field.options && !field.options.includes(text)) throw httpError(400, `Invalid ${field.label}`);
      if (text && field.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(text)) || new Date(text).toISOString().slice(0, 10) !== text)) throw httpError(400, `Invalid ${field.label}`);
      data[field.key] = text;
    }
    let document = {};
    if (data.nextReview && data.nextReview < data.date) throw httpError(400, 'Next review must not precede the visit');
    if (data.reviewDate && data.reviewDate < data.completionDate) throw httpError(400, 'Retention review must not precede treatment completion');
    if (req.file) {
      if (payload.kind !== 'CONSENT') throw httpError(400, 'Documents can only be attached to consent records');
      const bytes = req.file.buffer;
      const pdf = bytes.subarray(0, 5).toString() === '%PDF-';
      const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
      const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      if (!pdf && !png && !jpg) throw httpError(400, 'Upload a PDF, PNG or JPEG document');
      const filename = `${randomUUID()}.${pdf ? 'pdf' : png ? 'png' : 'jpg'}`;
      await saveFile('consents', filename, bytes, pdf ? 'application/pdf' : png ? 'image/png' : 'image/jpeg');
      written = filename;
      document = { documentFile: filename, documentName: path.basename(req.file.originalname), documentType: pdf ? 'application/pdf' : png ? 'image/png' : 'image/jpeg' };
    }
    const record = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(2060)`;
      const patient = await tx.patient.findUnique({ where: { id: req.params.patientId } });
      if (!patient) throw httpError(404, 'Patient not found');
      if (patient.archivedAt) throw httpError(409, 'Restore this patient before adding records');
      const previous = payload.previousId ? await tx.clinicalRecord.findUnique({ where: { id: Number(payload.previousId) }, include: { next: true } }) : null;
      if (payload.previousId && (!previous || previous.patientId !== patient.id || previous.kind !== payload.kind || previous.next)) throw httpError(409, 'Revise the latest record in this revision chain');
      if (payload.kind === 'CONSENT') {
        if (data.signerRole === 'Parent / guardian' && !data.relationship) throw httpError(400, 'Guardian relationship is required');
        if (patient.dob) {
          const eighteenth = new Date(patient.dob); eighteenth.setUTCFullYear(eighteenth.getUTCFullYear() + 18);
          if (new Date(data.signedDate) < eighteenth && data.signerRole !== 'Parent / guardian') throw httpError(400, 'Record parent or guardian consent for a minor');
        }
        if (data.decision === 'Granted' && !document.documentFile) throw httpError(400, 'Attach the signed consent document');
      }
      const identity = await actor(req.user, tx);
      const saved = await tx.clinicalRecord.create({ data: { patientId: patient.id, kind: payload.kind, data, version: previous ? previous.version + 1 : 1, previousId: previous?.id, status: payload.kind === 'TREATMENT_PLAN' ? 'Pending approval' : 'Recorded', authorId: identity.actorId, authorName: identity.actorName, ...document } });
      await tx.historyLog.create({ data: { patientId: patient.id, ...identity, action: `${definition.label} recorded`, details: `Record ${saved.id}, revision ${saved.version}`, changes: { before: previous?.data || null, after: data } } });
      if (!payload.previousId && (payload.kind === 'RETENTION' || payload.kind === 'DISCHARGE')) await tx.patient.update({ where: { id: patient.id }, data: { status: payload.kind === 'RETENTION' ? 'Retention' : 'Discharged' } });
      return saved;
    });
    committed = true;
    res.status(201).json(publicRecord(record));
  } catch (error) { if (written && !committed) await deleteFile('consents', written).catch(() => {}); next(error); }
});
router.post('/:patientId/:id/approve', authorizeRoles('STAFF', 'ADMIN'), async (req, res, next) => {
  try {
    const record = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(2060)`;
      const existing = await tx.clinicalRecord.findUnique({ where: { id: Number(req.params.id) }, include: { next: true, patient: true } });
      if (!existing || existing.patientId !== req.params.patientId) throw httpError(404, 'Record not found');
      if (existing.patient.archivedAt || existing.next || existing.kind !== 'TREATMENT_PLAN' || existing.status !== 'Pending approval') throw httpError(409, 'Only the latest pending treatment plan can be approved for an active patient');
      const identity = await actor(req.user, tx);
      const approved = await tx.clinicalRecord.update({ where: { id: existing.id }, data: { status: 'Approved', approvedBy: identity.actorId, approvedName: identity.actorName, approvedAt: new Date() } });
      await tx.historyLog.create({ data: { patientId: existing.patientId, ...identity, action: 'Treatment plan approved', details: `Record ${existing.id}, revision ${existing.version}`, changes: { before: 'Pending approval', after: 'Approved' } } });
      return approved;
    });
    res.json(publicRecord(record));
  } catch (error) { next(error); }
});
router.get('/:patientId/:id/document', async (req, res, next) => {
  try {
    const record = await prisma.clinicalRecord.findUnique({ where: { id: Number(req.params.id) } });
    if (!record || record.patientId !== req.params.patientId || !record.documentFile) throw httpError(404, 'Document not found');
    const file = await readFile('consents', path.basename(record.documentFile));
    res.set('Cache-Control', 'private, no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    res.attachment(record.documentName || record.documentFile);
    res.type(file.contentType).send(file.buffer);
  } catch (error) { next(error); }
});
router.use((error, req, res, next) => res.status(error.status || (error instanceof multer.MulterError || error instanceof SyntaxError ? 400 : 500)).json({ message: error.status || error instanceof multer.MulterError || error instanceof SyntaxError ? error.message : 'Could not process clinical record' }));
module.exports = router;
