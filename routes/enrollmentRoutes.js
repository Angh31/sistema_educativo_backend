// ====================================
// RUTAS DE INSCRIPCIONES
// ====================================

const express = require("express");
const router = express.Router();
const {
  getEnrollments,
  getEnrollmentsByStudent,
  getEnrollmentsByCourse,
  createEnrollment,
  deleteEnrollment,
  bulkEnrollment,
} = require("../controllers/enrollmentController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Obtener todas las inscripciones (solo Admin)
router.get("/", protect, authorize("ADMIN"), getEnrollments);

// Obtener inscripciones por estudiante (todos los roles autenticados)
router.get("/student/:studentId", protect, getEnrollmentsByStudent);

// Obtener inscripciones por curso (Admin/Teacher)
router.get(
  "/course/:courseId",
  protect,
  authorize("ADMIN", "TEACHER"),
  getEnrollmentsByCourse
);

// Crear inscripción (solo Admin)
router.post("/", protect, authorize("ADMIN"), createEnrollment);

// Inscripción masiva (solo Admin)
router.post("/bulk", protect, authorize("ADMIN"), bulkEnrollment);

// Eliminar inscripción (solo Admin)
router.delete("/:id", protect, authorize("ADMIN"), deleteEnrollment);

module.exports = router;
