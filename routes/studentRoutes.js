// ====================================
// RUTAS DE ESTUDIANTES - CON PROTECCIÓN IDOR
// ====================================
const express = require("express");
const router = express.Router();
const {
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentCredentials,
} = require("../controllers/studentController");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  checkResourceOwnership,
} = require("../middleware/authorizationMiddleware");

// Obtener todos los estudiantes (Admin/Teacher)
router.get("/", protect, authorize("ADMIN", "TEACHER"), getStudents);

// Obtener estudiante por ID (con validación de propiedad)
router.get("/:id", protect, checkResourceOwnership("student"), getStudentById);

// Actualizar estudiante (solo Admin)
router.put("/:id", protect, authorize("ADMIN"), updateStudent);

// Eliminar estudiante (solo Admin)
router.delete("/:id", protect, authorize("ADMIN"), deleteStudent);

// Obtener QR y PIN del estudiante (con validación)
router.get(
  "/:id/credentials",
  protect,
  checkResourceOwnership("student"),
  getStudentCredentials
);

module.exports = router;
