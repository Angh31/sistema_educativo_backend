// ====================================
// CONTROLADOR DE PADRES
// ====================================
// Maneja operaciones CRUD de padres y consulta de datos de sus hijos

const prisma = require("../db");

/**
 * getParents
 * ==========
 * Obtiene todos los padres con sus estudiantes asociados
 *
 * @route   GET /api/parents
 * @access  Private (Admin)
 */
const getParents = async (req, res, next) => {
  try {
    const parents = await prisma.parents.findMany({
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
        students: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });
    res.json(parents);
  } catch (error) {
    next(error);
  }
};

/**
 * getParentById
 * =============
 * Obtiene un padre con información COMPLETA de sus hijos
 *
 * @route   GET /api/parents/:id
 * @access  Private
 */
const getParentById = async (req, res, next) => {
  try {
    const parent = await prisma.parents.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
        students: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
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
              include: {
                course: {
                  select: {
                    name: true,
                  },
                },
              },
              orderBy: {
                created_at: "desc",
              },
            },
            attendance: {
              include: {
                course: {
                  select: {
                    name: true,
                  },
                },
              },
              orderBy: {
                date: "desc",
              },
              take: 30,
            },
          },
        },
      },
    });

    if (!parent) {
      res.status(404);
      throw new Error("Padre no encontrado");
    }

    res.json(parent);
  } catch (error) {
    next(error);
  }
};

/**
 * updateParent
 * ============
 * Actualiza los datos de un padre
 *
 * @route   PUT /api/parents/:id
 * @access  Private (Admin)
 */
const updateParent = async (req, res, next) => {
  try {
    const { name, last_name, phone, address } = req.body;

    const parentExists = await prisma.parents.findUnique({
      where: { id: req.params.id },
    });

    if (!parentExists) {
      res.status(404);
      throw new Error("Padre no encontrado");
    }

    const updated = await prisma.parents.update({
      where: { id: req.params.id },
      data: {
        name,
        last_name,
        phone,
        address,
      },
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
        students: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * deleteParent
 * ============
 * Elimina un padre si NO tiene estudiantes asignados
 *
 * @route   DELETE /api/parents/:id
 * @access  Private (Admin)
 */
const deleteParent = async (req, res, next) => {
  try {
    const parent = await prisma.parents.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        students: true,
      },
    });

    if (!parent) {
      res.status(404);
      throw new Error("Padre no encontrado");
    }

    if (parent.students.length > 0) {
      res.status(400);
      throw new Error(
        "No se puede eliminar un padre con estudiantes asignados. Primero desvincula los estudiantes."
      );
    }

    await prisma.users.delete({
      where: { id: parent.user_id },
    });

    res.json({ message: "Padre eliminado correctamente" });
  } catch (error) {
    next(error);
  }
};

/**
 * assignStudentsToParent
 * ======================
 * Asigna o actualiza los estudiantes de un padre
 *
 * @route   PUT /api/parents/:id/assign-students
 * @access  Private (Admin)
 */
const assignStudentsToParent = async (req, res, next) => {
  try {
    const { student_ids } = req.body;

    if (!Array.isArray(student_ids)) {
      res.status(400);
      throw new Error("student_ids debe ser un array");
    }

    const parent = await prisma.parents.findUnique({
      where: { id: req.params.id },
    });

    if (!parent) {
      res.status(404);
      throw new Error("Padre no encontrado");
    }

    // Desasignar estudiantes actuales
    await prisma.students.updateMany({
      where: { parent_id: req.params.id },
      data: { parent_id: null },
    });

    // Asignar nuevos estudiantes
    if (student_ids.length > 0) {
      await prisma.students.updateMany({
        where: { id: { in: student_ids } },
        data: { parent_id: req.params.id },
      });
    }

    // Retornar padre actualizado
    const updated = await prisma.parents.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            email: true,
          },
        },
        students: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * getChildrenSummary
 * ==================
 * Obtiene resumen del desempeño académico de los hijos
 *
 * @route   GET /api/parents/:id/children-summary
 * @access  Private
 */
const getChildrenSummary = async (req, res, next) => {
  try {
    const parent = await prisma.parents.findUnique({
      where: { id: req.params.id },
      include: {
        students: {
          include: {
            enrollments: {
              include: {
                course: true,
              },
            },
            grades: true,
            attendance: true,
          },
        },
      },
    });

    if (!parent) {
      res.status(404);
      throw new Error("Padre no encontrado");
    }

    const summary = parent.students.map((student) => {
      const totalGrades = student.grades.length;
      const averageGrade =
        totalGrades > 0
          ? (
              student.grades.reduce((sum, g) => sum + parseFloat(g.grade), 0) /
              totalGrades
            ).toFixed(2)
          : 0;

      const totalAttendance = student.attendance.length;
      const presentCount = student.attendance.filter(
        (a) => a.status === "PRESENT"
      ).length;
      const attendanceRate =
        totalAttendance > 0
          ? ((presentCount / totalAttendance) * 100).toFixed(2)
          : 0;

      return {
        student_id: student.id,
        name: `${student.name} ${student.last_name}`,
        total_courses: student.enrollments.length,
        average_grade: parseFloat(averageGrade),
        attendance_rate: parseFloat(attendanceRate),
        total_attendance_records: totalAttendance,
      };
    });

    res.json({
      parent: {
        id: parent.id,
        name: `${parent.name} ${parent.last_name}`,
      },
      children: summary,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getParents,
  getParentById,
  updateParent,
  deleteParent,
  assignStudentsToParent,
  getChildrenSummary,
};
