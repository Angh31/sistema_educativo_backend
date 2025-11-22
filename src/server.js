// ====================================
// SERVIDOR PRINCIPAL - DESARROLLO
// ====================================
const express = require("express");
require("dotenv").config();
const cors = require("cors");

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
const profileRoutes = require("../routes/profileRoutes");
const aiRoutes = require("../routes/aiRoutes");
const { errorHandler } = require("../middleware/errorMiddleware");
const { register, metricsMiddleware } = require("../middleware/metrics");

const PORT = process.env.PORT || 3000;
const app = express();

// ===== MIDDLEWARES GLOBALES =====
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://sistema-educativo-frontend-anghels-projects-79904a97.vercel.app",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(metricsMiddleware);

// ===== ENDPOINT DE MÉTRICAS =====
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// ===== CONFIGURAR RUTAS =====
app.use("/api/auth", authRoutes);
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
app.use("/api/ai", aiRoutes);

// ===== RUTA DE PRUEBA =====
app.get("/", (req, res) => {
  res.json({
    message: "🎓 API Sistema Académico funcionando",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// ===== MANEJADOR DE ERRORES =====
app.use(errorHandler);

// ===== INICIAR SERVIDOR =====
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Métricas disponibles en http://localhost:${PORT}/metrics`);
});
