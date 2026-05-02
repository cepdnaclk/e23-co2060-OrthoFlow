const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const prisma = require("../prismaClient");
const { authenticateToken, authorizeRoles } = require("./authRoutes");

const router = express.Router();

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../public/uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.use(authenticateToken);

router.post("/upload/:patientId", authorizeRoles("STAFF"), upload.single("image"), async (req, res) => {
  try {
    const { patientId } = req.params;
    const { description, category } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    const radiograph = await prisma.radiograph.create({
      data: {
        patientId,
        category: category || "RADIOGRAPH",
        fileUrl,
        description: description || "Uploaded Image"
      }
    });

    await prisma.historyLog.create({
      data: {
        patientId,
        action: category === "CASE_HISTORY" ? "Case History Uploaded" : "Radiograph Uploaded",
        details: `Uploaded a new image: ${description || "No description"}`
      }
    });

    res.status(201).json(radiograph);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/patient/:patientId", authorizeRoles("STAFF", "STUDENT"), async (req, res) => {
  try {
    const radiographs = await prisma.radiograph.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { uploadDate: 'desc' }
    });
    res.json(radiographs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", authorizeRoles("STAFF"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const radiograph = await prisma.radiograph.findUnique({ where: { id } });
    
    if (!radiograph) {
      return res.status(404).json({ error: "Image not found" });
    }
    
    // Delete physical file
    const filePath = path.join(__dirname, "../../public", radiograph.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    await prisma.radiograph.delete({ where: { id } });
    
    await prisma.historyLog.create({
      data: {
        patientId: radiograph.patientId,
        action: radiograph.category === "CASE_HISTORY" ? "Case History Deleted" : "Radiograph Deleted",
        details: `Deleted image: ${radiograph.description || "No description"}`
      }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
