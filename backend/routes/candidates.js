const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  },
});

const upload = multer({ storage });

// Mock DB (for now)
let candidates = [];

// POST /api/candidates/add
router.post("/add", upload.single("photo"), (req, res) => {
  try {
    if (!req.file || !req.body.name) {
      return res.status(400).json({ error: "Name and image are required." });
    }

    const { name } = req.body;
    const imagePath = `/uploads/${req.file.filename}`;

    const newCandidate = { name, imagePath };
    candidates.push(newCandidate);

    res.status(200).json({ message: "Candidate added", candidate: newCandidate });
  } catch (error) {
    console.error("Add candidate error:", error);
    res.status(500).json({ error: "Failed to add candidate" });
  }
});

module.exports = router;
