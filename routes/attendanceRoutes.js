// ====================================
// RUTAS DE ASISTENCIA - CON RATE LIMITING
// ====================================
const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit"); // ⬅️ NUEVO
const {
  getAttendance,
  getAttendanceByStudent,
  recordManualAttendance,
  recordQRAttendance,
  recordPINAttendance,
  bulkAttendance,
  getAttendanceStats,
} = require("../controllers/attendanceController");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  checkResourceOwnership,
} = require("../middleware/authorizationMiddleware");

// Rate limiter específico para endpoints públicos de asistencia
const attendanceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos
  message: {
    error: "Demasiados intentos de registro de asistencia. Intenta más tarde.",
  },
  skipSuccessfulRequests: false,
});

// Obtener asistencias con filtros (Admin/Teacher)
router.get("/", protect, authorize("ADMIN", "TEACHER"), getAttendance);

// Obtener asistencia por estudiante (con validación)
router.get(
  "/student/:studentId",
  protect,
  checkResourceOwnership("student", "studentId"),
  getAttendanceByStudent
);

// Obtener estadísticas de asistencia (con validación)
router.get(
  "/stats/:studentId",
  protect,
  checkResourceOwnership("student", "studentId"),
  getAttendanceStats
);

// Registrar asistencia manual (Admin/Teacher)
router.post(
  "/manual",
  protect,
  authorize("ADMIN", "TEACHER"),
  recordManualAttendance
);

// Registrar asistencia por QR (PÚBLICO - CON RATE LIMIT)
router.post("/qr", attendanceLimiter, recordQRAttendance);

// Registrar asistencia por PIN (PÚBLICO - CON RATE LIMIT)
router.post("/pin", attendanceLimiter, recordPINAttendance);

// Registrar asistencia masiva (Admin/Teacher)
router.post("/bulk", protect, authorize("ADMIN", "TEACHER"), bulkAttendance);

module.exports = router;
