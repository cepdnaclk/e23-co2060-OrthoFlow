const express = require("express");
const bcrypt = require("bcrypt");
const prisma = require("../prismaClient");
const { authenticateToken, authorizeRoles } = require("./authRoutes");

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles("ADMIN")); // Only ADMIN can access

router.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true, createdAt: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(400).json({ message: "Username taken" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashedPassword, role }
    });
    res.status(201).json({ id: user.id, username: user.username, role: user.role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    // Prevent self-deletion
    if (id === req.user.id) return res.status(400).json({ message: "Cannot delete yourself" });
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
