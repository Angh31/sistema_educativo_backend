// ====================================
// RUTAS DE CALIFICACIONES - CON PROTECCIÓN IDOR
// ====================================
const express = require("express");
const router = express.Router();
const {
  getGrades,
  getGradesByStudent,
  getGradesByCourse,
  createGrade,
  updateGrade,
  deleteGrade,
  bulkGrades,
  getStudentAverage,
  getCourseAverage,
  getGradeReport,
} = require("../controllers/gradeController");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  checkResourceOwnership,
} = require("../middleware/authorizationMiddleware");

// Obtener calificaciones con filtros (Admin/Teacher)
router.get("/", protect, authorize("ADMIN", "TEACHER"), getGrades);

// Obtener calificaciones por estudiante (con validación)
router.get(
  "/student/:studentId",
  protect,
  checkResourceOwnership("student", "studentId"),
  getGradesByStudent
);

// Obtener calificaciones por curso (Admin/Teacher con validación)
router.get(
  "/course/:courseId",
  protect,
  authorize("ADMIN", "TEACHER"),
  checkResourceOwnership("course", "courseId"),
  getGradesByCourse
);

// Obtener promedio de estudiante (con validación)
router.get(
  "/average/student/:studentId",
  protect,
  checkResourceOwnership("student", "studentId"),
  getStudentAverage
);

// Obtener promedio de curso (Admin/Teacher con validación)
router.get(
  "/average/course/:courseId",
  protect,
  authorize("ADMIN", "TEACHER"),
  checkResourceOwnership("course", "courseId"),
  getCourseAverage
);

// Obtener boleta de calificaciones (con validación)
router.get(
  "/report/:studentId",
  protect,
  checkResourceOwnership("student", "studentId"),
  getGradeReport
);

// Crear/actualizar calificación (Admin/Teacher)
router.post("/", protect, authorize("ADMIN", "TEACHER"), createGrade);

// Calificaciones masivas (Admin/Teacher)
router.post("/bulk", protect, authorize("ADMIN", "TEACHER"), bulkGrades);

// Actualizar calificación (Admin/Teacher)
router.put("/:id", protect, authorize("ADMIN", "TEACHER"), updateGrade);

// Eliminar calificación (solo Admin)
router.delete("/:id", protect, authorize("ADMIN"), deleteGrade);

module.exports = router;
