const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  predictStudentRisk,
  analyzeCoursePerformance,
} = require("../services/aiService");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// ✅ Endpoint para predicción individual
router.get("/predict-student/:id", protect, async (req, res) => {
  try {
    const student = await prisma.students.findUnique({
      where: { id: req.params.id },
      include: {
        grades: { orderBy: { created_at: "desc" }, take: 10 },
        attendance: {
          where: {
            date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    const avg =
      student.grades.length > 0
        ? student.grades.reduce((s, g) => s + parseFloat(g.grade), 0) /
          student.grades.length
        : 0;

    const att =
      student.attendance.length > 0
        ? (student.attendance.filter((a) => a.status === "PRESENT").length /
            student.attendance.length) *
          100
        : 0;

    const studentData = {
      name: student.name,
      last_name: student.last_name,
      average: avg.toFixed(2),
      attendance_rate: att.toFixed(1),
      courses_count: 0,
    };

    const prediction = await predictStudentRisk(studentData);

    res.json({
      student: {
        id: student.id,
        name: `${student.name} ${student.last_name}`,
        average: parseFloat(avg.toFixed(2)),
        attendance_rate: parseFloat(att.toFixed(1)),
      },
      prediction,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error al generar predicción" });
  }
});

// ✅ MEJORADO: Endpoint de alertas con datos completos
router.get("/alerts", protect, authorize("ADMIN"), async (req, res) => {
  try {
    console.log("🔍 Iniciando búsqueda de alertas...");

    const students = await prisma.students.findMany({
      include: {
        grades: { take: 5, orderBy: { created_at: "desc" } },
        attendance: {
          where: {
            date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
      },
    });

    console.log(`✅ Estudiantes encontrados: ${students.length}`);

    // ✅ MEJORADO: Calcular y enviar avg + att
    const alerts = students
      .map((s) => {
        // Calcular promedio
        const avg =
          s.grades.length > 0
            ? s.grades.reduce((sum, g) => sum + parseFloat(g.grade), 0) /
              s.grades.length
            : 0;

        // Calcular asistencia
        const att =
          s.attendance.length > 0
            ? (s.attendance.filter((a) => a.status === "PRESENT").length /
                s.attendance.length) *
              100
            : 0;

        console.log(
          `📊 ${s.name}: avg=${avg.toFixed(2)}, att=${att.toFixed(1)}%`
        );

        return {
          student_id: s.id,
          name: `${s.name} ${s.last_name}`,
          average: parseFloat(avg.toFixed(2)),
          attendance_rate: parseFloat(att.toFixed(1)),
          risk_level:
            avg < 60 ? "HIGH" : avg < 70 || att < 80 ? "MEDIUM" : "LOW",
          grades_count: s.grades.length,
          attendance_count: s.attendance.length,
        };
      })
      .filter((s) => s.average < 70 || s.attendance_rate < 80); // Filtrar en riesgo

    console.log(`🚨 Alertas generadas: ${alerts.length}`);

    res.json({ alerts, total: alerts.length });
  } catch (error) {
    console.error("❌ ERROR COMPLETO:", error);
    console.error("❌ STACK:", error.stack);
    res.status(500).json({
      error: "Error al obtener alertas",
      message: error.message,
    });
  }
});

// ✅ NUEVO: Endpoint para padres (ver alertas de sus hijos)
router.get(
  "/alerts/my-children",
  protect,
  authorize("PARENT"),
  async (req, res) => {
    try {
      console.log("👨‍👩‍👧 Buscando alertas para hijos del padre...");

      const parent = await prisma.parents.findUnique({
        where: { user_id: req.user.id },
        include: {
          students: {
            include: {
              grades: { take: 5, orderBy: { created_at: "desc" } },
              attendance: {
                where: {
                  date: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  },
                },
              },
            },
          },
        },
      });

      if (!parent || !parent.students || parent.students.length === 0) {
        return res.json({ alerts: [], total: 0 });
      }

      const alerts = parent.students
        .map((s) => {
          const avg =
            s.grades.length > 0
              ? s.grades.reduce((sum, g) => sum + parseFloat(g.grade), 0) /
                s.grades.length
              : 0;

          const att =
            s.attendance.length > 0
              ? (s.attendance.filter((a) => a.status === "PRESENT").length /
                  s.attendance.length) *
                100
              : 0;

          return {
            student_id: s.id,
            name: `${s.name} ${s.last_name}`,
            average: parseFloat(avg.toFixed(2)),
            attendance_rate: parseFloat(att.toFixed(1)),
            risk_level:
              avg < 60 ? "HIGH" : avg < 70 || att < 80 ? "MEDIUM" : "LOW",
          };
        })
        .filter((s) => s.average < 70 || s.attendance_rate < 80);

      res.json({ alerts, total: alerts.length });
    } catch (error) {
      console.error("❌ Error en alertas de padres:", error);
      res.status(500).json({ error: "Error al obtener alertas" });
    }
  }
);

// ✅ NUEVO: Endpoint para profesores (ver alertas de sus estudiantes)
router.get(
  "/alerts/my-students",
  protect,
  authorize("TEACHER"),
  async (req, res) => {
    try {
      console.log("👨‍🏫 Buscando alertas para estudiantes del profesor...");

      const teacher = await prisma.teachers.findUnique({
        where: { user_id: req.user.id },
        include: {
          courses: {
            include: {
              enrollments: {
                include: {
                  student: {
                    include: {
                      grades: { take: 5, orderBy: { created_at: "desc" } },
                      attendance: {
                        where: {
                          date: {
                            gte: new Date(
                              Date.now() - 30 * 24 * 60 * 60 * 1000
                            ),
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!teacher || !teacher.courses || teacher.courses.length === 0) {
        return res.json({ alerts: [], total: 0 });
      }

      // Extraer estudiantes únicos de todos los cursos
      const studentMap = new Map();
      teacher.courses.forEach((course) => {
        course.enrollments.forEach((enrollment) => {
          const s = enrollment.student;
          if (!studentMap.has(s.id)) {
            studentMap.set(s.id, s);
          }
        });
      });

      const students = Array.from(studentMap.values());

      const alerts = students
        .map((s) => {
          const avg =
            s.grades.length > 0
              ? s.grades.reduce((sum, g) => sum + parseFloat(g.grade), 0) /
                s.grades.length
              : 0;

          const att =
            s.attendance.length > 0
              ? (s.attendance.filter((a) => a.status === "PRESENT").length /
                  s.attendance.length) *
                100
              : 0;

          return {
            student_id: s.id,
            name: `${s.name} ${s.last_name}`,
            average: parseFloat(avg.toFixed(2)),
            attendance_rate: parseFloat(att.toFixed(1)),
            risk_level:
              avg < 60 ? "HIGH" : avg < 70 || att < 80 ? "MEDIUM" : "LOW",
          };
        })
        .filter((s) => s.average < 70 || s.attendance_rate < 80);

      res.json({ alerts, total: alerts.length });
    } catch (error) {
      console.error("❌ Error en alertas de profesor:", error);
      res.status(500).json({ error: "Error al obtener alertas" });
    }
  }
);

module.exports = router;
