const express = require("express");
const { getCollection } = require("./db");
const { requireRole, authenticate } = require("./middleware/auth");

const router = express.Router();

router.post("/sync-profile", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      firstName, lastName, email, phone,
      dateOfBirth, bloodType, address,
    } = req.body;

    const patients = await getCollection("patients");
    const existing = await patients.findOne({ id: userId });

    if (existing) {
      return res.json({
        message: "Profil patient existe déjà",
        patient: existing,
      });
    }

    const doc = {
      id: userId,
      first_name: firstName || req.user.firstName || "Utilisateur",
      last_name: lastName || req.user.lastName || "",
      email: email || req.user.email || null,
      phone: phone || null,
      date_of_birth: dateOfBirth || null,
      blood_type: bloodType || null,
      address: address || null,
      created_at: new Date(),
    };

    const result = await patients.insertOne(doc);

    return res.status(201).json({
      message: "Profil patient créé avec succès",
      patient: { _id: result.insertedId, ...doc },
    });
  } catch (err) {
    console.error("[POST /sync-profile]", err.message);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/profile", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const patients = await getCollection("patients");
    const patient = await patients.findOne({ id: userId });

    if (!patient) {
      const doc = {
        id: userId,
        first_name: req.user.firstName || "Utilisateur",
        last_name: req.user.lastName || "",
        email: req.user.email || null,
        phone: null,
        date_of_birth: null,
        blood_type: null,
        address: null,
        created_at: new Date(),
      };
      const result = await patients.insertOne(doc);
      return res.json({ _id: result.insertedId, ...doc });
    }

    return res.json(patient);
  } catch (err) {
    console.error("[GET /profile]", err.message);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/", requireRole("doctor", "admin"), async (req, res) => {
  try {
    const patients = await getCollection("patients");
    const allPatients = await patients
      .find({}, {
        projection: { _id: 0, id: 1, first_name: 1, last_name: 1, email: 1, phone: 1, date_of_birth: 1, blood_type: 1, created_at: 1 },
      })
      .sort({ created_at: -1 })
      .toArray();

    return res.json({ count: allPatients.length, patients: allPatients });
  } catch (err) {
    console.error("[GET /patients]", err.message);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/:id", authenticate, async (req, res) => {
  const idParam = req.params.id;
  const numericId = Number(idParam);

  if (req.user.role === "patient" && String(req.user.userId) !== idParam) {
    return res.status(403).json({ error: "Accès refusé" });
  }

  try {
    const patients = await getCollection("patients");
    const patient = numericId
      ? (await patients.findOne({ id: numericId })) || (await patients.findOne({ id: idParam }))
      : await patients.findOne({ id: idParam });

    if (!patient) return res.status(404).json({ error: "Patient introuvable" });
    return res.json(patient);
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/", requireRole("doctor", "admin"), async (req, res) => {
  try {
    const { firstName, lastName, email, phone, dateOfBirth, bloodType, address } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: "firstName et lastName sont requis" });
    }

    const patients = await getCollection("patients");
    const doc = {
      id: `patient-${Date.now()}`,
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phone || null,
      date_of_birth: dateOfBirth || null,
      blood_type: bloodType || null,
      address: address || null,
      created_at: new Date(),
    };

    const result = await patients.insertOne(doc);

    return res.status(201).json({
      message: "Patient créé",
      patient: { _id: result.insertedId, ...doc },
    });
  } catch (err) {
    console.error("[POST /patients]", err.message);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.put("/:id", requireRole("doctor", "admin"), async (req, res) => {
  try {
    const { firstName, lastName, email, phone, dateOfBirth, bloodType, address } = req.body;
    const patients = await getCollection("patients");

    const update = {};
    if (firstName !== undefined) update.first_name = firstName;
    if (lastName !== undefined) update.last_name = lastName;
    if (email !== undefined) update.email = email;
    if (phone !== undefined) update.phone = phone;
    if (dateOfBirth !== undefined) update.date_of_birth = dateOfBirth;
    if (bloodType !== undefined) update.blood_type = bloodType;
    if (address !== undefined) update.address = address;

    const result = await patients.findOneAndUpdate(
      { id: req.params.id },
      { $set: update },
      { returnDocument: "after" },
    );

    if (!result) return res.status(404).json({ error: "Patient introuvable" });
    return res.json({ message: "Patient mis à jour", patient: result });
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const patients = await getCollection("patients");
    const result = await patients.deleteOne({ id: req.params.id });

    if (!result.deletedCount) return res.status(404).json({ error: "Patient introuvable" });
    return res.json({ message: "Patient supprimé" });
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;