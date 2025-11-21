// ====================================
// RUTAS DE HORARIOS
// ====================================
const express = require("express");
const router = express.Router();
const {
  getSchedules,
  getSchedulesByCourse,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} = require("../controllers/scheduleController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Obtener todos los horarios (todos los roles autenticados)
router.get("/", protect, getSchedules);

// Obtener horarios por curso (todos los roles autenticados)
router.get("/course/:courseId", protect, getSchedulesByCourse);

// Crear horario (solo Admin)
router.post("/", protect, authorize("ADMIN"), createSchedule);

// Actualizar horario (solo Admin)
router.put("/:id", protect, authorize("ADMIN"), updateSchedule);

// Eliminar horario (solo Admin)
router.delete("/:id", protect, authorize("ADMIN"), deleteSchedule);

module.exports = router;
