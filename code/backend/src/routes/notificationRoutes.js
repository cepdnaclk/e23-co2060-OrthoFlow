const express = require("express");
const prisma = require("../prismaClient");
const { authenticateToken } = require("./authRoutes");

const router = express.Router();

router.use(authenticateToken);

async function getPatientNotificationFilter(user) {
  if (!user.email) return [];

  const matchingPatients = await prisma.patient.findMany({
    where: { email: user.email },
    select: { id: true },
  });

  return matchingPatients.map((patient) => ({
    patientId: patient.id,
    recipientType: "PATIENT",
  }));
}

async function getCurrentUser(req) {
  return prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, role: true },
  });
}

router.get("/", async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    const patientFilters = await getPatientNotificationFilter(currentUser);
    const roleFilters = [];

    if (["STAFF", "ADMIN"].includes(currentUser.role)) {
      roleFilters.push({ userId: req.user.id });
    }

    const filters = [
      ...roleFilters,
      ...patientFilters,
    ];

    if (filters.length === 0) {
      return res.json([]);
    }

    const notifications = await prisma.notification.findMany({
      where: { OR: filters },
      include: {
        patient: { select: { name: true, patientId: true } },
        appointment: { select: { date: true, time: true, type: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/read-all", async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    const patientFilters = await getPatientNotificationFilter(currentUser);
    const filters = [
      { userId: req.user.id },
      ...patientFilters,
    ];

    await prisma.notification.updateMany({
      where: {
        OR: filters,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/:id/read", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    const patientFilters = await getPatientNotificationFilter(currentUser);
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        OR: [
          { userId: req.user.id },
          ...patientFilters,
        ],
      },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
