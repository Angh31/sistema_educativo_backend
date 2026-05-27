// ====================================
// CONTROLADOR DE ASISTENCIA
// ====================================
// Maneja el registro de asistencia por QR, PIN y manual

const prisma = require("../db");

/**
 * getAttendance
 * =============
 * Obtiene registros de asistencia con filtros opcionales
 *
 * @route   GET /api/attendance?course_id=uuid&date=2024-01-15
 * @access  Private (Admin/Teacher)
 *
 * Query params opcionales:
 * - course_id: filtrar por curso
 * - date: filtrar por fecha específica
 *
 * Caso de uso:
 * - Ver asistencia de un curso en una fecha
 * - Reporte general de asistencias
 */
const getAttendance = async (req, res, next) => {
  try {
    // Extraer query params
    const { course_id, date } = req.query;

    // Construir objeto where dinámicamente
    let where = {};
    if (course_id) where.course_id = course_id;
    if (date) where.date = new Date(date); // Convertir string a Date

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        student: true, // Datos del estudiante
        course: {
          include: {
            teacher: true, // Docente del curso
          },
        },
      },
      orderBy: {
        date: "desc", // Ordenar por fecha descendente (más recientes primero)
      },
    });

    res.json(attendance);
  } catch (error) {
    next(error);
  }
};

/**
 * getAttendanceByStudent
 * ======================
 * Obtiene el historial de asistencia de un estudiante
 *
 * @route   GET /api/attendance/student/:studentId
 * @access  Private
 *
 * Caso de uso: Ver historial de asistencia del estudiante
 */
const getAttendanceByStudent = async (req, res, next) => {
  try {
    const attendance = await prisma.attendance.findMany({
      where: { student_id: req.params.studentId },
      include: {
        course: {
          include: {
            teacher: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    res.json(attendance);
  } catch (error) {
    next(error);
  }
};

/**
 * recordManualAttendance
 * ======================
 * Registra asistencia manualmente (por el docente)
 *
 * @route   POST /api/attendance/manual
 * @access  Private (Teacher/Admin)
 *
 * Body esperado:
 * {
 *   student_id: string,
 *   course_id: string,
 *   date: string,              // "2024-01-15"
 *   status?: string            // "PRESENT"|"ABSENT"|"LATE"|"EXCUSED"
 * }
 *
 * Comportamiento:
 * - Si ya existe registro para ese día, lo ACTUALIZA
 * - Si no existe, lo CREA
 *
 * Validaciones:
 * - El estudiante está inscrito en el curso
 */
const recordManualAttendance = async (req, res, next) => {
  try {
    const { student_id, course_id, date, status } = req.body;

    // ===== VALIDAR CAMPOS REQUERIDOS =====
    if (!student_id || !course_id || !date) {
      res.status(400);
      throw new Error("student_id, course_id y date son requeridos");
    }

    // ===== VERIFICAR INSCRIPCIÓN =====
    const enrollment = await prisma.enrollments.findUnique({
      where: {
        student_id_course_id: {
          student_id,
          course_id,
        },
      },
    });

    if (!enrollment) {
      res.status(400);
      throw new Error("El estudiante no está inscrito en este curso");
    }

    // ===== VERIFICAR SI YA EXISTE REGISTRO =====
    // Constraint único: student_id + course_id + date
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        student_id_course_id_date: {
          student_id,
          course_id,
          date: new Date(date),
        },
      },
    });

    let attendance;

    if (existingAttendance) {
      // ===== ACTUALIZAR EXISTENTE =====
      attendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          status: status || "PRESENT",
          method: "MANUAL",
        },
        include: {
          student: true,
          course: true,
        },
      });
    } else {
      // ===== CREAR NUEVO =====
      attendance = await prisma.attendance.create({
        data: {
          student_id,
          course_id,
          date: new Date(date),
          status: status || "PRESENT",
          method: "MANUAL",
        },
        include: {
          student: true,
          course: true,
        },
      });
    }

    res.status(201).json(attendance);
  } catch (error) {
    next(error);
  }
};

/**
 * recordQRAttendance
 * ==================
 * Registra asistencia escaneando código QR del estudiante
 *
 * @route   POST /api/attendance/qr
 * @access  Public (pero validado con QR único)
 *
 * Body esperado:
 * {
 *   qr_code: string,    // Código QR único del estudiante
 *   course_id: string   // UUID del curso
 * }
 *
 * Flujo:
 * 1. Buscar estudiante por QR
 * 2. Verificar que está inscrito en el curso
 * 3. Verificar que no haya registrado asistencia hoy
 * 4. Crear registro con status PRESENT y method QR
 *
 * Caso de uso: Estudiante escanea su QR al entrar a clase
 */
const recordQRAttendance = async (req, res, next) => {
  try {
    const { qr_code, course_id } = req.body;

    // ===== VALIDAR CAMPOS =====
    if (!qr_code || !course_id) {
      res.status(400);
      throw new Error("qr_code y course_id son requeridos");
    }

    // ===== BUSCAR ESTUDIANTE POR QR =====
    const student = await prisma.students.findUnique({
      where: { qr_code },
    });

    if (!student) {
      res.status(404);
      throw new Error("Código QR inválido");
    }

    // ===== VERIFICAR INSCRIPCIÓN =====
    const enrollment = await prisma.enrollments.findUnique({
      where: {
        student_id_course_id: {
          student_id: student.id,
          course_id,
        },
      },
    });

    if (!enrollment) {
      res.status(400);
      throw new Error("El estudiante no está inscrito en este curso");
    }

    // ===== OBTENER FECHA DE HOY (sin hora) =====
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Resetear a medianoche

    // ===== VERIFICAR SI YA REGISTRÓ HOY =====
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        student_id_course_id_date: {
          student_id: student.id,
          course_id,
          date: today,
        },
      },
    });

    if (existingAttendance) {
      res.status(400);
      throw new Error("Ya se registró asistencia para hoy");
    }

    // ===== CREAR REGISTRO =====
    const attendance = await prisma.attendance.create({
      data: {
        student_id: student.id,
        course_id,
        date: today,
        status: "PRESENT",
        method: "QR",
      },
      include: {
        student: true,
        course: true,
      },
    });

    res.status(201).json(attendance);
  } catch (error) {
    next(error);
  }
};

/**
 * recordPINAttendance
 * ===================
 * Registra asistencia ingresando PIN del estudiante
 *
 * @route   POST /api/attendance/pin
 * @access  Public (pero validado con PIN único)
 *
 * Body esperado:
 * {
 *   pin_code: string,   // PIN de 6 dígitos del estudiante
 *   course_id: string   // UUID del curso
 * }
 *
 * Similar a QR pero usa PIN en lugar de código QR
 * Útil cuando el estudiante no tiene QR disponible
 */
const recordPINAttendance = async (req, res, next) => {
  try {
    const { pin_code, course_id } = req.body;

    // ===== VALIDAR CAMPOS =====
    if (!pin_code || !course_id) {
      res.status(400);
      throw new Error("pin_code y course_id son requeridos");
    }

    // ===== BUSCAR ESTUDIANTE POR PIN =====
    // findFirst porque PIN no es unique en schema (aunque debería serlo)
    const student = await prisma.students.findFirst({
      where: { pin_code },
    });

    if (!student) {
      res.status(404);
      throw new Error("Código PIN inválido");
    }

    // ===== VERIFICAR INSCRIPCIÓN =====
    const enrollment = await prisma.enrollments.findUnique({
      where: {
        student_id_course_id: {
          student_id: student.id,
          course_id,
        },
      },
    });

    if (!enrollment) {
      res.status(400);
      throw new Error("El estudiante no está inscrito en este curso");
    }

    // ===== OBTENER FECHA DE HOY =====
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ===== VERIFICAR DUPLICADO =====
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        student_id_course_id_date: {
          student_id: student.id,
          course_id,
          date: today,
        },
      },
    });

    if (existingAttendance) {
      res.status(400);
      throw new Error("Ya se registró asistencia para hoy");
    }

    // ===== CREAR REGISTRO =====
    const attendance = await prisma.attendance.create({
      data: {
        student_id: student.id,
        course_id,
        date: today,
        status: "PRESENT",
        method: "PIN",
      },
      include: {
        student: true,
        course: true,
      },
    });

    res.status(201).json(attendance);
  } catch (error) {
    next(error);
  }
};

/**
 * bulkAttendance
 * ==============
 * Registra asistencia de múltiples estudiantes a la vez
 *
 * @route   POST /api/attendance/bulk
 * @access  Private (Teacher/Admin)
 *
 * Body esperado:
 * {
 *   course_id: string,
 *   date: string,
 *   attendanceList: [
 *     { student_id: string, status: "PRESENT"|"ABSENT"|"LATE"|"EXCUSED" },
 *     { student_id: string, status: "PRESENT" },
 *     ...
 *   ]
 * }
 *
 * Comportamiento:
 * - Para cada estudiante, verifica si ya existe registro
 * - Si existe, lo actualiza
 * - Si no existe, lo crea
 *
 * Caso de uso: Docente toma lista de toda la clase de una vez
 */
const bulkAttendance = async (req, res, next) => {
  try {
    const { course_id, date, attendanceList } = req.body;

    // ===== VALIDAR DATOS =====
    if (!course_id || !date || !Array.isArray(attendanceList)) {
      res.status(400);
      throw new Error("course_id, date y attendanceList son requeridos");
    }

    // ===== PROCESAR CADA REGISTRO =====
    const records = await Promise.all(
      attendanceList.map(async ({ student_id, status }) => {
        // Verificar si ya existe
        const existing = await prisma.attendance.findUnique({
          where: {
            student_id_course_id_date: {
              student_id,
              course_id,
              date: new Date(date),
            },
          },
        });

        if (existing) {
          // Actualizar existente
          return prisma.attendance.update({
            where: { id: existing.id },
            data: { status, method: "MANUAL" },
          });
        } else {
          // Crear nuevo
          return prisma.attendance.create({
            data: {
              student_id,
              course_id,
              date: new Date(date),
              status,
              method: "MANUAL",
            },
          });
        }
      })
    );

    res.status(201).json({
      message: `${records.length} registros de asistencia procesados`,
      records,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getAttendanceStats
 * ==================
 * Calcula estadísticas de asistencia de un estudiante
 *
 * @route   GET /api/attendance/stats/:studentId
 * @access  Private
 *
 * Retorna:
 * - Total de registros
 * - Presentes
 * - Ausentes
 * - Tardanzas
 * - Justificados
 * - Porcentaje de asistencia
 *
 * Caso de uso: Dashboard de estudiante o padre
 */
const getAttendanceStats = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // Total de registros
    const total = await prisma.attendance.count({
      where: { student_id: studentId },
    });

    // Contar por cada status
    const present = await prisma.attendance.count({
      where: {
        student_id: studentId,
        status: "PRESENT",
      },
    });

    const absent = await prisma.attendance.count({
      where: {
        student_id: studentId,
        status: "ABSENT",
      },
    });

    const late = await prisma.attendance.count({
      where: {
        student_id: studentId,
        status: "LATE",
      },
    });

    const excused = await prisma.attendance.count({
      where: {
        student_id: studentId,
        status: "EXCUSED",
      },
    });

    // Calcular porcentaje (presente / total * 100)
    const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

    res.json({
      total,
      present,
      absent,
      late,
      excused,
      percentage: parseFloat(percentage),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAttendance,
  getAttendanceByStudent,
  recordManualAttendance,
  recordQRAttendance,
  recordPINAttendance,
  bulkAttendance,
  getAttendanceStats,
};
