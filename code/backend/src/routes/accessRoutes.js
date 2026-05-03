const express = require("express");
const prisma = require("../prismaClient");
const { authenticateToken, authorizeRoles } = require("./authRoutes");

const router = express.Router();

router.use(authenticateToken);

// Get students with access to a specific patient
router.get("/patient/:patientId", authorizeRoles("STAFF"), async (req, res) => {
  try {
    const access = await prisma.patientAccess.findMany({
      where: { patientId: req.params.patientId },
      include: { user: { select: { id: true, username: true } } }
    });
    res.json(access);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Grant access
router.post("/patient/:patientId/grant", authorizeRoles("STAFF"), async (req, res) => {
  try {
    const { userId } = req.body;
    const { patientId } = req.params;
    
    // Check if user is student
    const student = await prisma.user.findUnique({ where: { id: parseInt(userId, 10) } });
    if (!student || student.role !== "STUDENT") {
      return res.status(400).json({ message: "Can only grant access to students" });
    }

    const access = await prisma.patientAccess.create({
      data: {
        userId: student.id,
        patientId,
        grantedBy: req.user.id
      }
    });
    res.status(201).json(access);
  } catch (error) {
    res.status(500).json({ error: "Access may already be granted" });
  }
});

// Revoke access
router.delete("/patient/:patientId/revoke/:userId", authorizeRoles("STAFF"), async (req, res) => {
  try {
    const { patientId, userId } = req.params;
    await prisma.patientAccess.deleteMany({
      where: {
        patientId,
        userId: parseInt(userId, 10)
      }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all students (for the dropdown)
router.get("/students", authorizeRoles("STAFF"), async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, username: true }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
