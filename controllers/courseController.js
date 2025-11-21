// ====================================
// CONTROLADOR DE CURSOS
// ====================================
// Maneja todas las operaciones CRUD de cursos/materias

const prisma = require("../db");

/**
 * getCourses
 * ==========
 * Obtiene todos los cursos con información relacionada
 *
 * @route   GET /api/courses
 * @access  Private
 */
const getCourses = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const gradeLevel = req.query.grade_level
      ? parseInt(req.query.grade_level)
      : null;

    const skip = (page - 1) * limit;

    // Construir where
    const where = {};

    // Búsqueda por nombre
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    // Filtro por nivel de grado
    if (gradeLevel) {
      where.grade_level = gradeLevel;
    }

    const total = await prisma.courses.count({ where });

    const courses = await prisma.courses.findMany({
      where,
      skip,
      take: limit,
      include: {
        teacher: true,
        schedules: true,
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
      },
      orderBy: {
        name: "asc",
      },
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      courses,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getCourseById
 * =============
 * Obtiene un curso específico con TODA su información
 *
 * @route   GET /api/courses/:id
 * @access  Private
 */
const getCourseById = async (req, res, next) => {
  try {
    const course = await prisma.courses.findUnique({
      where: { id: req.params.id },
      include: {
        teacher: true,
        schedules: true,
        enrollments: {
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
          },
        },
        grades: {
          include: {
            student: {
              select: {
                name: true,
                last_name: true,
              },
            },
          },
        },
        attendance: {
          include: {
            student: {
              select: {
                name: true,
                last_name: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!course) {
      res.status(404);
      throw new Error("Curso no encontrado");
    }

    res.json(course);
  } catch (error) {
    next(error);
  }
};

/**
 * createCourse
 * ============
 * Crea un nuevo curso en el sistema
 *
 * @route   POST /api/courses
 * @access  Private (Admin)
 */
const createCourse = async (req, res, next) => {
  try {
    const { name, description, teacher_id, grade_level } = req.body;

    // ===== VALIDAR CAMPOS REQUERIDOS =====
    if (!name || !teacher_id || !grade_level) {
      res.status(400);
      throw new Error(
        "Los campos name, teacher_id y grade_level son requeridos"
      );
    }

    // ===== VALIDAR QUE EL DOCENTE EXISTE =====
    const teacherExists = await prisma.teachers.findUnique({
      where: { id: teacher_id },
    });

    if (!teacherExists) {
      res.status(404);
      throw new Error("Docente no encontrado");
    }

    // ===== CREAR CURSO =====
    const course = await prisma.courses.create({
      data: {
        name,
        description,
        teacher_id,
        grade_level: parseInt(grade_level),
      },
      include: {
        teacher: true,
      },
    });

    res.status(201).json(course);
  } catch (error) {
    next(error);
  }
};

/**
 * updateCourse
 * ============
 * Actualiza los datos de un curso
 *
 * @route   PUT /api/courses/:id
 * @access  Private (Admin)
 */
const updateCourse = async (req, res, next) => {
  try {
    const { name, description, teacher_id, grade_level } = req.body;

    // Verificar que el curso existe
    const courseExists = await prisma.courses.findUnique({
      where: { id: req.params.id },
    });

    if (!courseExists) {
      res.status(404);
      throw new Error("Curso no encontrado");
    }

    // Actualizar
    const updated = await prisma.courses.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        teacher_id,
        grade_level: grade_level ? parseInt(grade_level) : undefined,
      },
      include: {
        teacher: true,
        schedules: true,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * deleteCourse
 * ============
 * Elimina un curso del sistema
 *
 * @route   DELETE /api/courses/:id
 * @access  Private (Admin)
 */
const deleteCourse = async (req, res, next) => {
  try {
    const course = await prisma.courses.findUnique({
      where: { id: req.params.id },
    });

    if (!course) {
      res.status(404);
      throw new Error("Curso no encontrado");
    }

    await prisma.courses.delete({
      where: { id: req.params.id },
    });

    res.json({ message: "Curso eliminado correctamente" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
};
