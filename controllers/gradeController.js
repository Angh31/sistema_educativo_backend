// ====================================
// CONTROLADOR DE CALIFICACIONES
// ====================================
// Maneja el registro, actualización y cálculo de calificaciones

const prisma = require("../db");

/**
 * getGrades
 * =========
 * Obtiene calificaciones con filtros opcionales
 *
 * @route   GET /api/grades?course_id=uuid&student_id=uuid&period=Primer Parcial
 * @access  Private (Admin/Teacher)
 *
 * Query params opcionales:
 * - course_id: filtrar por curso
 * - student_id: filtrar por estudiante
 * - period: filtrar por periodo (ej: "Primer Parcial")
 *
 * Caso de uso: Ver calificaciones con filtros específicos
 */
const getGrades = async (req, res, next) => {
  try {
    // Extraer query params
    const { course_id, student_id, period } = req.query;

    // Construir objeto where dinámicamente
    let where = {};
    if (course_id) where.course_id = course_id;
    if (student_id) where.student_id = student_id;
    if (period) where.period = period;

    const grades = await prisma.grades.findMany({
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
        created_at: "desc", // Más recientes primero
      },
    });

    res.json(grades);
  } catch (error) {
    next(error);
  }
};

/**
 * getGradesByStudent
 * ==================
 * Obtiene todas las calificaciones de un estudiante
 *
 * @route   GET /api/grades/student/:studentId
 * @access  Private
 *
 * Incluye información del curso y docente de cada calificación
 * Ordenadas por periodo y fecha
 *
 * Caso de uso: Boleta de calificaciones del estudiante
 */
const getGradesByStudent = async (req, res, next) => {
  try {
    const grades = await prisma.grades.findMany({
      where: { student_id: req.params.studentId },
      include: {
        course: {
          include: {
            teacher: true,
          },
        },
      },
      orderBy: [
        { period: "asc" }, // Primero por periodo
        { created_at: "desc" }, // Luego por fecha
      ],
    });

    res.json(grades);
  } catch (error) {
    next(error);
  }
};

/**
 * getGradesByCourse
 * =================
 * Obtiene todas las calificaciones de un curso
 *
 * @route   GET /api/grades/course/:courseId?period=Primer Parcial
 * @access  Private (Admin/Teacher)
 *
 * Query param opcional:
 * - period: filtrar por periodo específico
 *
 * Ordenadas por apellido del estudiante
 *
 * Caso de uso: Lista de calificaciones de la clase para el docente
 */
const getGradesByCourse = async (req, res, next) => {
  try {
    const { period } = req.query;

    // Construir where
    let where = { course_id: req.params.courseId };
    if (period) where.period = period;

    const grades = await prisma.grades.findMany({
      where,
      include: {
        student: true,
      },
      orderBy: {
        student: {
          last_name: "asc", // Ordenar alfabéticamente por apellido
        },
      },
    });

    res.json(grades);
  } catch (error) {
    next(error);
  }
};

/**
 * createGrade
 * ===========
 * Crea o actualiza una calificación
 *
 * @route   POST /api/grades
 * @access  Private (Teacher/Admin)
 *
 * Body esperado:
 * {
 *   student_id: string,
 *   course_id: string,
 *   grade: number,           // 0-100
 *   period: string,          // "Primer Parcial", "Segundo Parcial", etc.
 *   comment?: string         // Comentario opcional
 * }
 *
 * Comportamiento:
 * - Si ya existe calificación para ese estudiante+curso+periodo, la ACTUALIZA
 * - Si no existe, la CREA
 *
 * Validaciones:
 * 1. Todos los campos requeridos presentes
 * 2. Calificación entre 0 y 100
 * 3. Estudiante inscrito en el curso
 */
const createGrade = async (req, res, next) => {
  try {
    const { student_id, course_id, grade, period, comment } = req.body;

    // ===== VALIDAR CAMPOS REQUERIDOS =====
    if (!student_id || !course_id || grade === undefined || !period) {
      res.status(400);
      throw new Error("student_id, course_id, grade y period son requeridos");
    }

    // ===== VALIDAR RANGO DE CALIFICACIÓN =====
    if (grade < 0 || grade > 100) {
      res.status(400);
      throw new Error("La calificación debe estar entre 0 y 100");
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

    // ===== VERIFICAR SI YA EXISTE CALIFICACIÓN =====
    // Buscar por estudiante + curso + periodo
    const existingGrade = await prisma.grades.findFirst({
      where: {
        student_id,
        course_id,
        period,
      },
    });

    let result;

    if (existingGrade) {
      // ===== ACTUALIZAR EXISTENTE =====
      result = await prisma.grades.update({
        where: { id: existingGrade.id },
        data: {
          grade,
          comment,
        },
        include: {
          student: true,
          course: true,
        },
      });
    } else {
      // ===== CREAR NUEVA =====
      result = await prisma.grades.create({
        data: {
          student_id,
          course_id,
          grade,
          period,
          comment,
        },
        include: {
          student: true,
          course: true,
        },
      });
    }

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * updateGrade
 * ===========
 * Actualiza una calificación existente
 *
 * @route   PUT /api/grades/:id
 * @access  Private (Teacher/Admin)
 *
 * Body esperado:
 * {
 *   grade?: number,
 *   comment?: string
 * }
 *
 * Permite modificar solo la calificación y/o el comentario
 * No permite cambiar estudiante, curso o periodo
 */
const updateGrade = async (req, res, next) => {
  try {
    const { grade, comment } = req.body;

    // Verificar que existe
    const gradeExists = await prisma.grades.findUnique({
      where: { id: req.params.id },
    });

    if (!gradeExists) {
      res.status(404);
      throw new Error("Calificación no encontrada");
    }

    // ===== VALIDAR RANGO SI SE PROPORCIONA =====
    if (grade !== undefined && (grade < 0 || grade > 100)) {
      res.status(400);
      throw new Error("La calificación debe estar entre 0 y 100");
    }

    // Actualizar
    const updated = await prisma.grades.update({
      where: { id: req.params.id },
      data: {
        grade,
        comment,
      },
      include: {
        student: true,
        course: true,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * deleteGrade
 * ===========
 * Elimina una calificación
 *
 * @route   DELETE /api/grades/:id
 * @access  Private (Admin)
 *
 * Precaución: Operación irreversible
 * Solo administradores pueden eliminar calificaciones
 */
const deleteGrade = async (req, res, next) => {
  try {
    const grade = await prisma.grades.findUnique({
      where: { id: req.params.id },
    });

    if (!grade) {
      res.status(404);
      throw new Error("Calificación no encontrada");
    }

    await prisma.grades.delete({
      where: { id: req.params.id },
    });

    res.json({ message: "Calificación eliminada correctamente" });
  } catch (error) {
    next(error);
  }
};

/**
 * bulkGrades
 * ==========
 * Registra o actualiza calificaciones de múltiples estudiantes
 *
 * @route   POST /api/grades/bulk
 * @access  Private (Teacher/Admin)
 *
 * Body esperado:
 * {
 *   course_id: string,
 *   period: string,
 *   grades: [
 *     { student_id: string, grade: number, comment?: string },
 *     { student_id: string, grade: number, comment?: string },
 *     ...
 *   ]
 * }
 *
 * Comportamiento:
 * - Para cada estudiante, verifica si ya tiene calificación
 * - Si existe, actualiza
 * - Si no existe, crea
 *
 * Caso de uso: Docente ingresa calificaciones de toda la clase
 */
const bulkGrades = async (req, res, next) => {
  try {
    const { course_id, period, grades } = req.body;

    // ===== VALIDAR DATOS =====
    if (!course_id || !period || !Array.isArray(grades)) {
      res.status(400);
      throw new Error("course_id, period y grades son requeridos");
    }

    // ===== PROCESAR CADA CALIFICACIÓN =====
    const records = await Promise.all(
      grades.map(async ({ student_id, grade, comment }) => {
        // Verificar si ya existe
        const existing = await prisma.grades.findFirst({
          where: {
            student_id,
            course_id,
            period,
          },
        });

        if (existing) {
          // Actualizar
          return prisma.grades.update({
            where: { id: existing.id },
            data: { grade, comment },
          });
        } else {
          // Crear
          return prisma.grades.create({
            data: {
              student_id,
              course_id,
              grade,
              period,
              comment,
            },
          });
        }
      })
    );

    res.status(201).json({
      message: `${records.length} calificaciones procesadas`,
      records,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getStudentAverage
 * =================
 * Calcula el promedio de un estudiante
 *
 * @route   GET /api/grades/average/student/:studentId?period=Primer Parcial
 * @access  Private
 *
 * Query param opcional:
 * - period: calcular promedio solo de un periodo específico
 *
 * Retorna:
 * - Promedio general
 * - Total de cursos
 * - Lista de calificaciones incluidas en el cálculo
 *
 * Caso de uso: Dashboard del estudiante
 */
const getStudentAverage = async (req, res, next) => {
  try {
    const { period } = req.query;

    // Construir where
    let where = { student_id: req.params.studentId };
    if (period) where.period = period;

    // Obtener todas las calificaciones
    const grades = await prisma.grades.findMany({
      where,
      include: {
        course: true,
      },
    });

    // Si no hay calificaciones
    if (grades.length === 0) {
      return res.json({
        average: 0,
        total_courses: 0,
        grades: [],
      });
    }

    // ===== CALCULAR PROMEDIO =====
    // reduce: suma todas las calificaciones
    const total = grades.reduce((sum, g) => sum + parseFloat(g.grade), 0);
    // Promedio = suma / cantidad
    const average = (total / grades.length).toFixed(2);

    res.json({
      average: parseFloat(average),
      total_courses: grades.length,
      grades,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getCourseAverage
 * ================
 * Calcula estadísticas de un curso
 *
 * @route   GET /api/grades/average/course/:courseId?period=Primer Parcial
 * @access  Private (Teacher/Admin)
 *
 * Query param opcional:
 * - period: calcular solo para un periodo
 *
 * Retorna:
 * - Promedio del curso
 * - Total de estudiantes
 * - Cantidad de aprobados (>=60)
 * - Cantidad de reprobados (<60)
 * - Porcentaje de aprobación
 *
 * Caso de uso: Análisis del desempeño del curso
 */
const getCourseAverage = async (req, res, next) => {
  try {
    const { period } = req.query;

    // Construir where
    let where = { course_id: req.params.courseId };
    if (period) where.period = period;

    const grades = await prisma.grades.findMany({
      where,
    });

    // Si no hay calificaciones
    if (grades.length === 0) {
      return res.json({
        average: 0,
        total_students: 0,
        passed: 0,
        failed: 0,
      });
    }

    // ===== CÁLCULOS =====
    const total = grades.reduce((sum, g) => sum + parseFloat(g.grade), 0);
    const average = (total / grades.length).toFixed(2);

    // Contar aprobados (nota >= 60)
    const passed = grades.filter((g) => parseFloat(g.grade) >= 60).length;
    const failed = grades.length - passed;

    // Calcular porcentaje de aprobación
    const passRate = ((passed / grades.length) * 100).toFixed(2);

    res.json({
      average: parseFloat(average),
      total_students: grades.length,
      passed,
      failed,
      pass_rate: parseFloat(passRate),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getGradeReport
 * ==============
 * Genera boleta de calificaciones completa de un estudiante
 *
 * @route   GET /api/grades/report/:studentId?period=Primer Parcial
 * @access  Private
 *
 * Query param opcional:
 * - period: generar boleta solo de un periodo
 *
 * Retorna:
 * - Información del estudiante
 * - Lista completa de calificaciones por curso
 * - Resumen con promedio, aprobados y reprobados
 *
 * Caso de uso: Imprimir boleta de calificaciones
 */
const getGradeReport = async (req, res, next) => {
  try {
    const { period } = req.query;

    // ===== OBTENER ESTUDIANTE =====
    const student = await prisma.students.findUnique({
      where: { id: req.params.studentId },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    if (!student) {
      res.status(404);
      throw new Error("Estudiante no encontrado");
    }

    // ===== OBTENER CALIFICACIONES =====
    let where = { student_id: req.params.studentId };
    if (period) where.period = period;

    const grades = await prisma.grades.findMany({
      where,
      include: {
        course: {
          include: {
            teacher: true,
          },
        },
      },
      orderBy: {
        course: {
          name: "asc", // Ordenar por nombre del curso
        },
      },
    });

    // ===== CALCULAR RESUMEN =====
    const total = grades.reduce((sum, g) => sum + parseFloat(g.grade), 0);
    const average = grades.length > 0 ? (total / grades.length).toFixed(2) : 0;
    const passed = grades.filter((g) => parseFloat(g.grade) >= 60).length;
    const failed = grades.filter((g) => parseFloat(g.grade) < 60).length;

    res.json({
      student: {
        id: student.id,
        name: `${student.name} ${student.last_name}`,
        email: student.user.email,
      },
      period: period || "Todos los periodos",
      grades,
      summary: {
        total_courses: grades.length,
        average: parseFloat(average),
        passed,
        failed,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
