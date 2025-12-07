const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Helper: read participants from JSON file
function readParticipants() {
  const data = fs.readFileSync(path.join(__dirname, "participants.json"), "utf-8");
  return JSON.parse(data);
}

// Helper: write participants to JSON file
function writeParticipants(participants) {
  fs.writeFileSync(
    path.join(__dirname, "participants.json"),
    JSON.stringify(participants, null, 2),
    "utf-8"
  );
}

// API: draw angelito by code
app.post("/api/draw", (req, res) => {
  const code = (req.body.code || "").trim().toLowerCase();

  if (!code) {
    return res.status(400).json({ success: false, message: "Código requerido" });
  }

  let participants = readParticipants();

  // Find participant by code
  const current = participants.find((p) => p.code === code);

  if (!current) {
    return res.status(404).json({ success: false, message: "Código inválido" });
  }

  if (current.hasPicked) {
    return res
      .status(400)
      .json({ success: false, message: "Este código ya fue usado. No puedes volver a elegir." });
  }

  // Helper to see if someone is already assigned as angelito
  const isAlreadyAssigned = (participantId) =>
    participants.some((p) => p.assignedTo === participantId);

  // Get available candidates:
  // 1) Not myself
  // 2) Not already selected by someone else
  const candidates = participants.filter(
    (p) => p.id !== current.id && !isAlreadyAssigned(p.id)
  );

  if (candidates.length === 0) {
    return res.status(400).json({
      success: false,
      message:
        "No quedan angelitos disponibles. Contacta al organizador para revisar las asignaciones."
    });
  }

  // Pick random candidate
  const randomIndex = Math.floor(Math.random() * candidates.length);
  const chosen = candidates[randomIndex];

  // Update current participant
  current.hasPicked = true;
  current.assignedTo = chosen.id;

  // Replace updated participant in the array
  participants = participants.map((p) => (p.id === current.id ? current : p));

  // Save back to JSON
  writeParticipants(participants);

  return res.json({
    success: true,
    angelitoName: chosen.name
  });
});

// API: admin data (who got whom)
app.get("/api/admin-data", (req, res) => {
  const participants = readParticipants();

  const result = participants.map((p) => {
    const assigned = participants.find((x) => x.id === p.assignedTo);
    return {
      id: p.id,
      name: p.name,
      code: p.code,
      hasPicked: p.hasPicked,
      angelito: assigned ? assigned.name : null
    };
  });

  res.json(result);
});

// Serve index as default
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Angelito app running on http://localhost:${PORT}`);
});
