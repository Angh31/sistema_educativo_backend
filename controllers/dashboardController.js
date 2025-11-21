// ====================================
// CONTROLADOR DE DASHBOARDS - CORREGIDO
// ====================================
// Genera estadísticas y datos consolidados para cada tipo de usuario

const prisma = require("../db");

/**
 * getAdminDashboard
 * =================
 * Genera dashboard con estadísticas generales del sistema
 *
 * @route   GET /api/dashboard/admin
 * @access  Private (Admin)
 *
 * Incluye:
 * - Contadores totales (estudiantes, docentes, cursos, padres)
 * - Asistencia del día
 * - Cursos más populares
 * - Promedio general del sistema
 *
 * Caso de uso: Vista principal del administrador
 */
const getAdminDashboard = async (req, res, next) => {
  try {
    // ===== CONTADORES TOTALES =====
    const totalStudents = await prisma.students.count();
    const totalTeachers = await prisma.teachers.count();
    const totalCourses = await prisma.courses.count();
    const totalParents = await prisma.parents.count();

    // ===== ASISTENCIA DE HOY =====
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Resetear a medianoche

    // Total de registros hoy
    const todayAttendance = await prisma.attendance.count({
      where: { date: today },
    });

    // Total de presentes hoy
    const todayPresent = await prisma.attendance.count({
      where: {
        date: today,
        status: "PRESENT",
      },
    });

    // ===== CURSOS MÁS POPULARES =====
    // Agrupar inscripciones por curso y contar
    const popularCourses = await prisma.enrollments.groupBy({
      by: ["course_id"], // Agrupar por curso
      _count: {
        student_id: true, // Contar estudiantes
      },
      orderBy: {
        _count: {
          student_id: "desc", // Ordenar por más inscritos
        },
      },
      take: 5, // Solo top 5
    });

    // Obtener información completa de cada curso
    const coursesWithNames = await Promise.all(
      popularCourses.map(async (item) => {
        const course = await prisma.courses.findUnique({
          where: { id: item.course_id },
          include: { teacher: true },
        });
        return {
          course,
          total_students: item._count.student_id,
        };
      })
    );

    // ===== PROMEDIO GENERAL =====
    const allGrades = await prisma.grades.findMany();
    const generalAverage =
      allGrades.length > 0
        ? (
            allGrades.reduce((sum, g) => sum + parseFloat(g.grade), 0) /
            allGrades.length
          ).toFixed(2)
        : 0;

    // ===== RESPUESTA =====
    res.json({
      totals: {
        students: totalStudents,
        teachers: totalTeachers,
        courses: totalCourses,
        parents: totalParents,
      },
      today_attendance: {
        total: todayAttendance,
        present: todayPresent,
        rate:
          todayAttendance > 0
            ? ((todayPresent / todayAttendance) * 100).toFixed(2)
            : 0,
      },
      popular_courses: coursesWithNames,
      general_average: parseFloat(generalAverage),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getTeacherDashboard
 * ===================
 * Genera dashboard personalizado para un docente
 *
 * @route   GET /api/dashboard/teacher/:teacherId
 * @access  Private (Teacher)
 *
 * Incluye:
 * - Total de cursos que imparte
 * - Total de estudiantes en todos sus cursos
 * - Asistencia registrada hoy
 * - Resumen de cada curso con promedio y asistencia
 *
 * Caso de uso: Vista principal del docente
 */
const getTeacherDashboard = async (req, res, next) => {
  try {
    const { teacherId } = req.params;

    // ===== OBTENER DOCENTE CON TODOS SUS CURSOS =====
    const teacher = await prisma.teachers.findUnique({
      where: { id: teacherId },
      include: {
        courses: {
          include: {
            // Inscripciones con datos de estudiantes
            enrollments: {
              include: {
                student: {
                  include: {
                    user: {
                      select: {
                        email: true,
                      },
                    },
                  },
                },
              },
            },
            // Calificaciones del curso
            grades: true,
            // Asistencia de HOY
            attendance: {
              where: {
                date: new Date(new Date().setHours(0, 0, 0, 0)),
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      res.status(404);
      throw new Error("Docente no encontrado");
    }

    // ===== CALCULAR TOTALES =====
    const totalCourses = teacher.courses.length;

    // Sumar estudiantes de todos los cursos
    const totalStudents = teacher.courses.reduce(
      (sum, c) => sum + c.enrollments.length,
      0
    );

    // Sumar asistencia registrada hoy en todos los cursos
    const todayAttendance = teacher.courses.reduce(
      (sum, c) => sum + c.attendance.length,
      0
    );

    // ===== RESUMEN POR CURSO =====
    const coursesSummary = teacher.courses.map((course) => {
      // Calcular promedio del curso
      const totalGrades = course.grades.length;
      const average =
        totalGrades > 0
          ? (
              course.grades.reduce((sum, g) => sum + parseFloat(g.grade), 0) /
              totalGrades
            ).toFixed(2)
          : 0;

      return {
        id: course.id,
        name: course.name,
        description: course.description,
        grade_level: course.grade_level,
        total_students: course.enrollments.length,
        average_grade: parseFloat(average),
        today_attendance: course.attendance.length,
      };
    });

    // ===== RESPUESTA =====
    res.json({
      teacher: {
        id: teacher.id,
        name: teacher.name, // Solo nombre
        last_name: teacher.last_name, // Apellido por separado
        specialty: teacher.specialty,
      },
      totals: {
        courses: totalCourses,
        students: totalStudents,
        today_attendance: todayAttendance,
      },
      courses: coursesSummary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getStudentDashboard
 * ===================
 * Genera dashboard personalizado para un estudiante
 *
 * @route   GET /api/dashboard/student/:studentId
 * @access  Private (Student/Parent)
 *
 * ⚠️ IMPORTANTE: Esta función es usada por:
 * - StudentDashboard.jsx (para el estudiante mismo)
 * - ParentDashboard.jsx (para ver datos de sus hijos)
 *
 * Estructura esperada por el frontend:
 * - student.name (string separado)
 * - student.last_name (string separado)
 * - courses (array de enrollments COMPLETOS con course.name, course.teacher, etc.)
 * - latest_grades (array con course.name incluido)
 * - latest_attendance (array con course.name incluido)
 * - average (string con promedio)
 * - attendance_rate (string con porcentaje)
 */
const getStudentDashboard = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // ===== OBTENER ESTUDIANTE CON TODA SU INFORMACIÓN =====
    const student = await prisma.students.findUnique({
      where: { id: studentId },
      include: {
        // Usuario (para email)
        user: {
          select: {
            email: true,
          },
        },
        // ⬇️ CRÍTICO: Inscripciones con TODAS las relaciones
        // El frontend espera: enrollment.course.name, enrollment.course.teacher, etc.
        enrollments: {
          include: {
            course: {
              include: {
                teacher: true, // ✅ Incluir docente
                schedules: true, // ✅ Incluir horarios
              },
            },
          },
        },
        // ⬇️ CRÍTICO: Calificaciones con nombre del curso
        // El frontend espera: grade.course.name
        grades: {
          include: {
            course: {
              select: {
                name: true, // ✅ Incluir nombre del curso
              },
            },
          },
          orderBy: {
            created_at: "desc",
          },
          take: 10, // Últimas 10 calificaciones
        },
        // ⬇️ CRÍTICO: Asistencia con nombre del curso
        // El frontend espera: record.course.name
        attendance: {
          include: {
            course: {
              select: {
                name: true, // ✅ Incluir nombre del curso
              },
            },
          },
          orderBy: {
            date: "desc",
          },
          take: 20, // Últimos 20 registros
        },
      },
    });

    // ===== VALIDAR QUE EL ESTUDIANTE EXISTE =====
    if (!student) {
      res.status(404);
      throw new Error("Estudiante no encontrado");
    }

    // ===== CALCULAR PROMEDIO GENERAL =====
    const totalGrades = student.grades.length;
    const average =
      totalGrades > 0
        ? (
            student.grades.reduce((sum, g) => sum + parseFloat(g.grade), 0) /
            totalGrades
          ).toFixed(2)
        : "0.00"; // ⬅️ STRING (el frontend lo espera así)

    // ===== CALCULAR PORCENTAJE DE ASISTENCIA =====
    const totalAttendance = student.attendance.length;
    const presentCount = student.attendance.filter(
      (a) => a.status === "PRESENT"
    ).length;
    const attendanceRate =
      totalAttendance > 0
        ? ((presentCount / totalAttendance) * 100).toFixed(2)
        : "0"; // ⬅️ STRING (el frontend lo espera así)

    // ===== RESPUESTA =====
    // ⚠️ IMPORTANTE: Mantener nombres exactos que espera el frontend
    res.json({
      // Datos básicos del estudiante
      student: {
        id: student.id,
        name: student.name, // ⬅️ Solo nombre (NO concatenado)
        last_name: student.last_name, // ⬅️ Apellido por separado
        email: student.user.email,
        qr_code: student.qr_code, // Para registrar asistencia
        pin_code: student.pin_code, // Para registrar asistencia
      },
      // ⬇️ CRÍTICO: courses = enrollments completos (NO simplificados)
      // El frontend hace: courses.map(enrollment => enrollment.course.name)
      courses: student.enrollments,
      // ⬇️ CRÍTICO: latest_grades (NO recent_grades)
      // El frontend hace: latest_grades.map(grade => grade.course.name)
      latest_grades: student.grades,
      // ⬇️ CRÍTICO: latest_attendance (NO recent_attendance)
      // El frontend hace: latest_attendance.map(record => record.course.name)
      latest_attendance: student.attendance,
      // Promedio general (string)
      average: average,
      // Tasa de asistencia (string)
      attendance_rate: attendanceRate,
    });
  } catch (error) {
    next(error);
  }
};

// ===== EXPORTAR FUNCIONES =====
module.exports = {
  getAdminDashboard,
  getTeacherDashboard,
  getStudentDashboard,
};
