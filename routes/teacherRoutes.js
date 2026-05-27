// ====================================
// RUTAS DE DOCENTES
// ====================================

const express = require("express");
const router = express.Router();
const {
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
} = require("../controllers/teacherController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Obtener todos los docentes (solo Admin)
router.get("/", protect, authorize("ADMIN"), getTeachers);

// Obtener docente por ID (todos los roles autenticados)
router.get("/:id", protect, getTeacherById);

// Actualizar docente (solo Admin)
router.put("/:id", protect, authorize("ADMIN"), updateTeacher);

// Eliminar docente (solo Admin)
router.delete("/:id", protect, authorize("ADMIN"), deleteTeacher);

module.exports = router;
