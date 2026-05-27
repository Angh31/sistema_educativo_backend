// ====================================
// CONTROLADOR DE INSCRIPCIONES
// ====================================
// Maneja la relación N:M entre estudiantes y cursos

const prisma = require("../db");

/**
 * getEnrollments
 * ==============
 * Obtiene todas las inscripciones del sistema
 *
 * @route   GET /api/enrollments
 * @access  Private (Admin)
 */
const getEnrollments = async (req, res, next) => {
  try {
    const enrollments = await prisma.enrollments.findMany({
      include: {
        student: {
          include: {
            user: {
              select: {
                email: true,
                role: true,
              },
            },
          },
        },
        course: {
          include: {
            teacher: true,
            schedules: true,
          },
        },
      },
      orderBy: {
        enrolled_at: "desc",
      },
    });
    res.json(enrollments);
  } catch (error) {
    next(error);
  }
};

/**
 * getEnrollmentsByStudent
 * =======================
 * Obtiene todos los cursos en los que está inscrito un estudiante
 *
 * @route   GET /api/enrollments/student/:studentId
 * @access  Private
 */
const getEnrollmentsByStudent = async (req, res, next) => {
  try {
    const enrollments = await prisma.enrollments.findMany({
      where: { student_id: req.params.studentId },
      include: {
        student: {
          include: {
            user: {
              select: {
                email: true,
                role: true,
              },
            },
          },
        },
        course: {
          include: {
            teacher: true,
            schedules: true,
          },
        },
      },
      orderBy: {
        enrolled_at: "desc",
      },
    });
    res.json(enrollments);
  } catch (error) {
    next(error);
  }
};

/**
 * getEnrollmentsByCourse
 * ======================
 * Obtiene la lista de estudiantes inscritos en un curso específico
 *
 * @route   GET /api/enrollments/course/:courseId
 * @access  Private (Admin/Teacher)
 */
const getEnrollmentsByCourse = async (req, res, next) => {
  try {
    const enrollments = await prisma.enrollments.findMany({
      where: { course_id: req.params.courseId },
      include: {
        student: {
          include: {
            user: {
              select: {
                email: true,
                role: true,
              },
            },
          },
        },
        course: {
          include: {
            teacher: true,
            schedules: true,
          },
        },
      },
      orderBy: {
        enrolled_at: "desc",
      },
    });
    res.json(enrollments);
  } catch (error) {
    next(error);
  }
};

/**
 * createEnrollment
 * ================
 * Inscribe un estudiante en un curso
 *
 * @route   POST /api/enrollments
 * @access  Private (Admin)
 */
const createEnrollment = async (req, res, next) => {
  try {
    const { student_id, course_id } = req.body;

    // ===== VALIDAR CAMPOS REQUERIDOS =====
    if (!student_id || !course_id) {
      res.status(400);
      throw new Error("student_id y course_id son requeridos");
    }

    // ===== VERIFICAR QUE EL ESTUDIANTE EXISTE =====
    const studentExists = await prisma.students.findUnique({
      where: { id: student_id },
    });

    if (!studentExists) {
      res.status(404);
      throw new Error("Estudiante no encontrado");
    }

    // ===== VERIFICAR QUE EL CURSO EXISTE =====
    const courseExists = await prisma.courses.findUnique({
      where: { id: course_id },
    });

    if (!courseExists) {
      res.status(404);
      throw new Error("Curso no encontrado");
    }

    // ===== VERIFICAR SI YA ESTÁ INSCRITO =====
    const alreadyEnrolled = await prisma.enrollments.findUnique({
      where: {
        student_id_course_id: {
          student_id,
          course_id,
        },
      },
    });

    if (alreadyEnrolled) {
      res.status(400);
      throw new Error("El estudiante ya está inscrito en este curso");
    }

    // ===== CREAR INSCRIPCIÓN =====
    const enrollment = await prisma.enrollments.create({
      data: {
        student_id,
        course_id,
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                email: true,
                role: true,
              },
            },
          },
        },
        course: {
          include: {
            teacher: true,
            schedules: true,
          },
        },
      },
    });

    res.status(201).json(enrollment);
  } catch (error) {
    next(error);
  }
};

/**
 * deleteEnrollment
 * ================
 * Elimina una inscripción (des-inscribir estudiante de un curso)
 *
 * @route   DELETE /api/enrollments/:id
 * @access  Private (Admin)
 */
const deleteEnrollment = async (req, res, next) => {
  try {
    const enrollment = await prisma.enrollments.findUnique({
      where: { id: req.params.id },
    });

    if (!enrollment) {
      res.status(404);
      throw new Error("Inscripción no encontrada");
    }

    await prisma.enrollments.delete({
      where: { id: req.params.id },
    });

    res.json({ message: "Inscripción eliminada correctamente" });
  } catch (error) {
    next(error);
  }
};

/**
 * bulkEnrollment
 * ==============
 * Inscribe múltiples estudiantes en un curso de una sola vez
 *
 * @route   POST /api/enrollments/bulk
 * @access  Private (Admin)
 */
const bulkEnrollment = async (req, res, next) => {
  try {
    const { student_ids, course_id } = req.body;

    // ===== VALIDAR DATOS =====
    if (!student_ids || !Array.isArray(student_ids) || !course_id) {
      res.status(400);
      throw new Error("student_ids (array) y course_id son requeridos");
    }

    // ===== VERIFICAR QUE EL CURSO EXISTE =====
    const courseExists = await prisma.courses.findUnique({
      where: { id: course_id },
    });

    if (!courseExists) {
      res.status(404);
      throw new Error("Curso no encontrado");
    }

    // ===== CREAR INSCRIPCIONES =====
    const enrollments = await Promise.all(
      student_ids.map(async (student_id) => {
        // Verificar si ya existe la inscripción
        const exists = await prisma.enrollments.findUnique({
          where: {
            student_id_course_id: {
              student_id,
              course_id,
            },
          },
        });

        // Si NO existe, crear inscripción
        if (!exists) {
          return prisma.enrollments.create({
            data: {
              student_id,
              course_id,
            },
            include: {
              student: {
                include: {
                  user: {
                    select: {
                      email: true,
                      role: true,
                    },
                  },
                },
              },
              course: {
                include: {
                  teacher: true,
                },
              },
            },
          });
        }
        return null;
      })
    );

    // Filtrar los null (los que ya estaban inscritos)
    const created = enrollments.filter((e) => e !== null);

    res.status(201).json({
      message: `${created.length} estudiantes inscritos correctamente`,
      enrollments: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getAvailableStudentsForCourse
 * ==============================
 * Obtiene estudiantes que NO están inscritos en un curso específico
 *
 * @route   GET /api/enrollments/available-students/:courseId
 * @access  Private (Admin)
 */
const getAvailableStudentsForCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    // Obtener IDs de estudiantes ya inscritos
    const enrolledStudents = await prisma.enrollments.findMany({
      where: { course_id: courseId },
      select: { student_id: true },
    });

    const enrolledIds = enrolledStudents.map((e) => e.student_id);

    // Obtener estudiantes NO inscritos
    const availableStudents = await prisma.students.findMany({
      where: {
        id: {
          notIn: enrolledIds,
        },
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        last_name: "asc",
      },
    });

    res.json({ students: availableStudents });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEnrollments,
  getEnrollmentsByStudent,
  getEnrollmentsByCourse,
  createEnrollment,
  deleteEnrollment,
  bulkEnrollment,
  getAvailableStudentsForCourse,
};
