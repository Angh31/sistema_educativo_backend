// ====================================
// CONTROLADOR DE DOCENTES
// ====================================
// Maneja todas las operaciones CRUD de docentes

const prisma = require("../db");

/**
 * getTeachers
 * ===========
 * Obtiene todos los docentes con sus cursos asignados
 *
 * @route   GET /api/teachers
 * @access  Private (Admin)
 */
const getTeachers = async (req, res, next) => {
  try {
    const teachers = await prisma.teachers.findMany({
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
        courses: {
          include: {
            schedules: true,
            _count: {
              select: {
                enrollments: true,
              },
            },
          },
        },
      },
    });
    res.json(teachers);
  } catch (error) {
    next(error);
  }
};

/**
 * getTeacherById
 * ==============
 * Obtiene un docente específico con información completa de sus cursos
 *
 * @route   GET /api/teachers/:id
 * @access  Private
 */
const getTeacherById = async (req, res, next) => {
  try {
    const teacher = await prisma.teachers.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
        courses: {
          include: {
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
            _count: {
              select: {
                enrollments: true,
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

    res.json(teacher);
  } catch (error) {
    next(error);
  }
};

/**
 * updateTeacher
 * =============
 * Actualiza los datos de un docente
 *
 * @route   PUT /api/teachers/:id
 * @access  Private (Admin)
 */
const updateTeacher = async (req, res, next) => {
  try {
    const { name, last_name, specialty, phone } = req.body;

    const teacherExists = await prisma.teachers.findUnique({
      where: { id: req.params.id },
    });

    if (!teacherExists) {
      res.status(404);
      throw new Error("Docente no encontrado");
    }

    const updated = await prisma.teachers.update({
      where: { id: req.params.id },
      data: {
        name,
        last_name,
        specialty,
        phone,
      },
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
        courses: true,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * deleteTeacher
 * =============
 * Elimina un docente si NO tiene cursos asignados
 *
 * @route   DELETE /api/teachers/:id
 * @access  Private (Admin)
 */
const deleteTeacher = async (req, res, next) => {
  try {
    const teacher = await prisma.teachers.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        courses: true,
      },
    });

    if (!teacher) {
      res.status(404);
      throw new Error("Docente no encontrado");
    }

    if (teacher.courses.length > 0) {
      res.status(400);
      throw new Error("No se puede eliminar un docente con cursos asignados");
    }

    await prisma.users.delete({
      where: { id: teacher.user_id },
    });

    res.json({ message: "Docente eliminado correctamente" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
};
