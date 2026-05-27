// ====================================
// RUTAS DE CURSOS
// ====================================

const express = require("express");
const router = express.Router();
const {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} = require("../controllers/courseController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Obtener todos los cursos (todos los roles autenticados)
router.get("/", protect, getCourses);

// Obtener curso por ID (todos los roles autenticados)
router.get("/:id", protect, getCourseById);

// Crear curso (solo Admin)
router.post("/", protect, authorize("ADMIN"), createCourse);

// Actualizar curso (solo Admin)
router.put("/:id", protect, authorize("ADMIN"), updateCourse);

// Eliminar curso (solo Admin)
router.delete("/:id", protect, authorize("ADMIN"), deleteCourse);

module.exports = router;
