// ====================================
// SERVIDOR PRINCIPAL - DESARROLLO
// ====================================
const express = require("express");
require("dotenv").config();
const cors = require("cors");

// const rateLimit = require("express-rate-limit");

// ===== IMPORTAR RUTAS =====
const authRoutes = require("../routes/authRoutes");
const studentRoutes = require("../routes/studentRoutes");
const teacherRoutes = require("../routes/teacherRoutes");
const courseRoutes = require("../routes/courseRoutes");
const scheduleRoutes = require("../routes/scheduleRoutes");
const enrollmentRoutes = require("../routes/enrollmentRoutes");
const attendanceRoutes = require("../routes/attendanceRoutes");
const gradeRoutes = require("../routes/gradeRoutes");
const parentRoutes = require("../routes/parentRoutes");
const dashboardRoutes = require("../routes/dashboardRoutes");
const { errorHandler } = require("../middleware/errorMiddleware");
const profileRoutes = require("../routes/profileRoutes");

const PORT = process.env.PORT || 3000;
const app = express();

// ===== MIDDLEWARES GLOBALES =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ===== RATE LIMITERS DESACTIVADOS PARA DESARROLLO =====
// ⚠️ IMPORTANTE: Activar en producción
/*
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Más alto para desarrollo
  message: {
    error: "Demasiadas peticiones, intenta de nuevo más tarde",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Más alto para desarrollo
  message: {
    error: "Demasiados intentos de inicio de sesión, intenta de nuevo más tarde",
  },
  skipSuccessfulRequests: true,
});

// Aplicar limiters
// app.use(generalLimiter);
*/

// ===== CONFIGURAR RUTAS =====
app.use("/api/auth", authRoutes); // Sin limiter en desarrollo
app.use("/api/students", studentRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/grades", gradeRoutes);
app.use("/api/parents", parentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/profile", profileRoutes);

// ✅ NUEVO: Métricas y IA
const { register, metricsMiddleware } = require("../middleware/metrics");
const aiRoutes = require("../routes/aiRoutes");

// Aplicar middleware de métricas a todas las rutas
app.use(metricsMiddleware);

// Endpoint de métricas para Prometheus
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Rutas de IA
app.use("/api/ai", aiRoutes);

// ===== RUTA DE PRUEBA =====
app.get("/", (req, res) => {
  res.json({
    message: "🎓 API Sistema Académico funcionando",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    rateLimiting: "DISABLED (development)", // ⬅️ Indicador
    endpoints: {
      auth: "/api/auth",
      students: "/api/students",
      teachers: "/api/teachers",
      courses: "/api/courses",
      schedules: "/api/schedules",
      enrollments: "/api/enrollments",
      attendance: "/api/attendance",
      grades: "/api/grades",
      parents: "/api/parents",
      dashboard: "/api/dashboard",
    },
  });
});

// ===== MANEJADOR DE ERRORES =====
app.use(errorHandler);

// ===== INICIAR SERVIDOR =====
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || "development"}`);
  console.log(`⚠️  Rate limiting: DESACTIVADO (desarrollo)`);
});
