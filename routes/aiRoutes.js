// ====================================
// RUTAS DE IA - COMPLETO CON GEMINI
// ====================================

const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  predictStudentRisk,
  analyzeCoursePerformance,
} = require("../services/aiService");
const { PrismaClient } = require("@prisma/client");
const axios = require("axios");

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

// ✅ MEJORADO: Endpoint de alertas con datos completos (ADMIN)
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
      .filter((s) => s.average < 70 || s.attendance_rate < 80);

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

// ✅ Endpoint para padres (ver alertas de sus hijos)
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

// ✅ Endpoint para profesores (ver alertas de sus estudiantes)
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

// ✅ NUEVO: Análisis detallado con Gemini AI
router.get("/analyze-student/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🤖 Analizando estudiante con Gemini:", id);

    // 1. Obtener datos del estudiante
    const student = await prisma.students.findUnique({
      where: { id },
      include: {
        user: { select: { email: true } },
        grades: {
          take: 20,
          orderBy: { created_at: "desc" },
          include: { course: { select: { name: true } } },
        },
        attendance: {
          where: {
            date: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
          include: { course: { select: { name: true } } },
        },
        enrollments: {
          include: {
            course: {
              select: {
                name: true,
                teacher: { select: { name: true, last_name: true } },
              },
            },
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    // 2. Calcular métricas
    const avg =
      student.grades.length > 0
        ? student.grades.reduce((sum, g) => sum + parseFloat(g.grade), 0) /
          student.grades.length
        : 0;

    const totalAttendance = student.attendance.length;
    const presentCount = student.attendance.filter(
      (a) => a.status === "PRESENT"
    ).length;
    const absentCount = student.attendance.filter(
      (a) => a.status === "ABSENT"
    ).length;
    const lateCount = student.attendance.filter(
      (a) => a.status === "LATE"
    ).length;
    const attendanceRate =
      totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

    // 3. Preparar datos para Gemini
    const gradesBySubject = {};
    student.grades.forEach((g) => {
      const courseName = g.course?.name || "Sin curso";
      if (!gradesBySubject[courseName]) {
        gradesBySubject[courseName] = [];
      }
      gradesBySubject[courseName].push(parseFloat(g.grade));
    });

    const subjectSummary = Object.entries(gradesBySubject).map(
      ([subject, grades]) => ({
        subject,
        average: (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1),
        count: grades.length,
      })
    );

    // 4. Crear prompt para Gemini
    const prompt = `
Eres un asesor educativo experto. Analiza el siguiente perfil de estudiante y proporciona un diagnóstico detallado.

📊 DATOS DEL ESTUDIANTE:
- Nombre: ${student.name} ${student.last_name}
- Promedio General: ${avg.toFixed(2)}
- Tasa de Asistencia: ${attendanceRate.toFixed(1)}%
- Ausencias: ${absentCount} de ${totalAttendance} clases
- Tardanzas: ${lateCount}
- Cursos inscritos: ${student.enrollments.length}

📈 RENDIMIENTO POR MATERIA:
${subjectSummary
  .map((s) => `- ${s.subject}: ${s.average} (${s.count} calificaciones)`)
  .join("\n")}

🎯 RESPONDE EN FORMATO JSON EXACTO (sin markdown, solo JSON puro):
{
  "risk_level": "HIGH|MEDIUM|LOW",
  "diagnosis": "Diagnóstico general en 2-3 oraciones",
  "strengths": ["fortaleza 1", "fortaleza 2"],
  "weaknesses": ["debilidad 1", "debilidad 2"],
  "risk_factors": ["factor de riesgo 1", "factor de riesgo 2"],
  "recommendations": [
    {
      "priority": "ALTA|MEDIA|BAJA",
      "action": "Acción específica a tomar",
      "responsible": "Quién debe hacerlo (docente/padre/estudiante/orientador)"
    }
  ],
  "action_plan": "Plan de acción resumido en 2-3 pasos concretos"
}
`;

    // 5. Llamar a Gemini
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY no configurada" });
    }

    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }
    );

    // 6. Extraer respuesta
    const geminiText =
      geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Limpiar respuesta (quitar markdown si existe)
    let cleanedText = geminiText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let analysis;
    try {
      analysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Error parseando respuesta de Gemini:", parseError);
      // Respuesta por defecto si falla el parseo
      analysis = {
        risk_level: avg < 60 ? "HIGH" : avg < 70 ? "MEDIUM" : "LOW",
        diagnosis: "Análisis automático basado en métricas del sistema.",
        strengths: ["Datos insuficientes para determinar fortalezas"],
        weaknesses: ["Requiere más datos para análisis detallado"],
        risk_factors: avg < 60 ? ["Promedio bajo"] : [],
        recommendations: [
          {
            priority: "MEDIA",
            action: "Programar seguimiento con el estudiante",
            responsible: "Orientador",
          },
        ],
        action_plan: "Monitorear progreso y programar reunión de seguimiento.",
      };
    }

    // 7. Responder
    res.json({
      student: {
        id: student.id,
        name: `${student.name} ${student.last_name}`,
        email: student.user?.email,
      },
      metrics: {
        average: parseFloat(avg.toFixed(2)),
        attendance_rate: parseFloat(attendanceRate.toFixed(1)),
        total_classes: totalAttendance,
        absences: absentCount,
        late_arrivals: lateCount,
        courses_enrolled: student.enrollments.length,
        grades_count: student.grades.length,
      },
      subjects: subjectSummary,
      analysis,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error en analyze-student:", error);

    // Detectar error 429 de Gemini
    if (error.response?.status === 429) {
      return res.status(429).json({
        error: "rate_limit",
        message: "Servicio de IA ocupado. Intenta en 1 minuto.",
      });
    }

    res.status(500).json({
      error: "Error al analizar estudiante",
      message: error.message,
    });
  }
});

module.exports = router;
