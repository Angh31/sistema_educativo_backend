// ====================================
// RUTAS DE DASHBOARDS - SOLUCIÓN COMPLETA
// ====================================
const express = require("express");
const router = express.Router();
const {
  getAdminDashboard,
  getTeacherDashboard,
  getStudentDashboard,
} = require("../controllers/dashboardController");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  checkResourceOwnership,
} = require("../middleware/authorizationMiddleware");

// ============================================
// DASHBOARDS
// ============================================

// Dashboard de administrador (solo Admin)
router.get("/admin", protect, authorize("ADMIN"), getAdminDashboard);

// ✅ NUEVO: Dashboard de docente SIN parámetro (usa el token)
router.get("/teacher", protect, authorize("TEACHER"), async (req, res) => {
  try {
    const prisma = require("../db");

    console.log("📊 Dashboard teacher para user:", req.user.id);

    // Obtener profesor del token
    const teacher = await prisma.teachers.findUnique({
      where: { user_id: req.user.id },
      include: {
        courses: {
          include: {
            enrollments: {
              include: {
                student: {
                  include: {
                    user: { select: { email: true } },
                  },
                },
              },
            },
            grades: true,
            attendance: {
              where: {
                date: { equals: new Date(new Date().setHours(0, 0, 0, 0)) },
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Profesor no encontrado" });
    }

    // Calcular totales
    const totalCourses = teacher.courses.length;

    const allStudents = new Set();
    teacher.courses.forEach((course) => {
      course.enrollments.forEach((e) => allStudents.add(e.student_id));
    });
    const totalStudents = allStudents.size;

    const todayAttendance = teacher.courses.reduce(
      (sum, course) => sum + course.attendance.length,
      0
    );

    // Preparar cursos con estadísticas
    const coursesWithStats = teacher.courses.map((course) => {
      const avgGrade =
        course.grades.length > 0
          ? course.grades.reduce((sum, g) => sum + parseFloat(g.grade), 0) /
            course.grades.length
          : 0;

      return {
        id: course.id,
        name: course.name,
        description: course.description,
        grade_level: course.grade_level,
        total_students: course.enrollments.length,
        average_grade: parseFloat(avgGrade.toFixed(2)),
        today_attendance: course.attendance.length,
      };
    });

    res.json({
      teacher: {
        id: teacher.id,
        name: teacher.name,
        last_name: teacher.last_name,
        specialty: teacher.specialty,
        phone: teacher.phone,
      },
      totals: {
        courses: totalCourses,
        students: totalStudents,
        today_attendance: todayAttendance,
      },
      courses: coursesWithStats,
    });
  } catch (error) {
    console.error("❌ Error en dashboard teacher:", error);
    res.status(500).json({
      error: "Error al obtener dashboard",
      message: error.message,
    });
  }
});

// Dashboard de docente CON parámetro (validación IDOR)
router.get(
  "/teacher/:teacherId",
  protect,
  checkResourceOwnership("teacher", "teacherId"),
  getTeacherDashboard
);

// ✅ NUEVO: Dashboard de estudiante SIN parámetro (usa el token)
router.get("/student", protect, authorize("STUDENT"), async (req, res) => {
  try {
    const prisma = require("../db");

    console.log("📊 Dashboard student para user:", req.user.id);

    // Obtener estudiante del token
    const student = await prisma.students.findUnique({
      where: { user_id: req.user.id },
      include: {
        user: { select: { email: true } },
        enrollments: {
          include: {
            course: {
              include: {
                teacher: true,
                schedules: true,
              },
            },
          },
        },
        grades: {
          take: 10,
          orderBy: { created_at: "desc" },
          include: { course: { select: { name: true } } },
        },
        attendance: {
          take: 10,
          orderBy: { date: "desc" },
          include: { course: { select: { name: true } } },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    // Calcular promedio
    const avg =
      student.grades.length > 0
        ? student.grades.reduce((sum, g) => sum + parseFloat(g.grade), 0) /
          student.grades.length
        : 0;

    // Calcular asistencia
    const att =
      student.attendance.length > 0
        ? (student.attendance.filter((a) => a.status === "PRESENT").length /
            student.attendance.length) *
          100
        : 0;

    res.json({
      student: {
        id: student.id,
        name: student.name,
        last_name: student.last_name,
        pin_code: student.pin_code,
        qr_code: student.qr_code,
      },
      courses: student.enrollments,
      average: parseFloat(avg.toFixed(2)),
      attendance_rate: parseFloat(att.toFixed(1)),
      latest_grades: student.grades,
      latest_attendance: student.attendance,
    });
  } catch (error) {
    console.error("❌ Error en dashboard student:", error);
    res.status(500).json({
      error: "Error al obtener dashboard",
      message: error.message,
    });
  }
});

// Dashboard de estudiante (con validación de propiedad)
router.get(
  "/student/:studentId",
  protect,
  checkResourceOwnership("student", "studentId"),
  getStudentDashboard
);

module.exports = router;

// ============================================
// EXPLICACIÓN DE LA SOLUCIÓN
// ============================================

/*
AHORA TIENES 2 ENDPOINTS PARA PROFESORES:

1. GET /api/dashboard/teacher
   - Sin parámetros
   - Usa el token para identificar al profesor
   - Lo usa TeacherDashboard.jsx
   - Más seguro (no puede ver otros profesores)

2. GET /api/dashboard/teacher/:teacherId
   - Con parámetro
   - Con validación IDOR
   - Para uso interno o admin

BENEFICIOS:
✅ Frontend funciona sin cambios
✅ Backend seguro
✅ No más error 403
✅ Mantiene la validación IDOR existente
*/
