const express = require("express");
const pool = require("./db");
const { requireRole, authenticate } = require("./middleware/auth");

const router = express.Router();

// POST /api/patients/sync-profile — Create patient profile after registration
// This endpoint is called when a user registers to create their patient record
router.post("/sync-profile", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      bloodType,
      address,
    } = req.body;

    // Check if patient already exists
    const existing = await pool.query("SELECT * FROM patients WHERE id = $1", [
      userId,
    ]);
    if (existing.rows[0]) {
      return res.json({
        message: "Profil patient existe déjà",
        patient: existing.rows[0],
      });
    }

    // Create patient with user ID from auth-service
    const { rows } = await pool.query(
      `INSERT INTO patients (id, first_name, last_name, email, phone, date_of_birth, blood_type, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, first_name, last_name, email, phone, date_of_birth, blood_type, address, created_at`,
      [
        userId,
        firstName || req.user.firstName || "Utilisateur",
        lastName || req.user.lastName || "",
        email || req.user.email || null,
        phone || null,
        dateOfBirth || null,
        bloodType || null,
        address || null,
      ],
    );

    return res.status(201).json({
      message: "Profil patient créé avec succès",
      patient: rows[0],
    });
  } catch (err) {
    console.error("[POST /sync-profile]", err.message);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/patients/profile — current user profile
router.get("/profile", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { rows } = await pool.query(
      `SELECT id, first_name, last_name, email, phone, date_of_birth, blood_type, address, created_at
       FROM patients WHERE id = $1`,
      [userId],
    );
    if (!rows[0]) {
      // Auto-create patient profile if not exists
      const { rows: newPatient } = await pool.query(
        `INSERT INTO patients (id, first_name, last_name, email)
         VALUES ($1, $2, $3, $4)
         RETURNING id, first_name, last_name, email, phone, date_of_birth, blood_type, address, created_at`,
        [
          userId,
          req.user.firstName || "Utilisateur",
          req.user.lastName || "",
          req.user.email || null,
        ],
      );
      return res.json(newPatient[0]);
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error("[GET /profile]", err.message);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/patients  — médecin/admin seulement
router.get("/", requireRole("doctor", "admin"), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, first_name, last_name, email, phone, date_of_birth, blood_type, created_at
       FROM patients ORDER BY created_at DESC`,
    );
    return res.json({ count: rows.length, patients: rows });
  } catch (err) {
    console.error("[GET /patients]", err.message);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/patients/:id  — patient voit le sien, médecin/admin voit tous
router.get("/:id", authenticate, async (req, res) => {
  const { id } = req.params;

  // Patient peut seulement voir son propre profil
  if (req.user.role === "patient" && req.user.userId !== id) {
    return res.status(403).json({ error: "Accès refusé" });
  }

  try {
    const { rows } = await pool.query("SELECT * FROM patients WHERE id = $1", [
      id,
    ]);
    if (!rows[0]) return res.status(404).json({ error: "Patient introuvable" });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/patients  — créer un patient (admin ou doctor)
router.post("/", requireRole("doctor", "admin"), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      bloodType,
      address,
    } = req.body;

    if (!firstName || !lastName) {
      return res
        .status(400)
        .json({ error: "firstName et lastName sont requis" });
    }

    const { rows } = await pool.query(
      `INSERT INTO patients (first_name, last_name, email, phone, date_of_birth, blood_type, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, first_name, last_name, email, created_at`,
      [
        firstName,
        lastName,
        email || null,
        phone || null,
        dateOfBirth || null,
        bloodType || null,
        address || null,
      ],
    );

    return res.status(201).json({ message: "Patient créé", patient: rows[0] });
  } catch (err) {
    if (err.code === "23505")
      return res.status(409).json({ error: "Email déjà utilisé" });
    console.error("[POST /patients]", err.message);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/patients/:id  — modifier
router.put("/:id", requireRole("doctor", "admin"), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      bloodType,
      address,
    } = req.body;
    const { rows } = await pool.query(
      `UPDATE patients
       SET first_name = COALESCE($1, first_name),
           last_name  = COALESCE($2, last_name),
           email      = COALESCE($3, email),
           phone      = COALESCE($4, phone),
           date_of_birth = COALESCE($5, date_of_birth),
           blood_type = COALESCE($6, blood_type),
           address    = COALESCE($7, address)
       WHERE id = $8
       RETURNING *`,
      [
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth,
        bloodType,
        address,
        req.params.id,
      ],
    );
    if (!rows[0]) return res.status(404).json({ error: "Patient introuvable" });
    return res.json({ message: "Patient mis à jour", patient: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/patients/:id  — admin seulement
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM patients WHERE id = $1",
      [req.params.id],
    );
    if (!rowCount)
      return res.status(404).json({ error: "Patient introuvable" });
    return res.json({ message: "Patient supprimé" });
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
