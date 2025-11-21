// ====================================
// CONTROLADOR DE ESTUDIANTES
// ====================================
// Maneja todas las operaciones CRUD de estudiantes

const prisma = require("../db");

/**
 * getStudents
 * ===========
 * Obtiene la lista completa de estudiantes con sus datos relacionados
 *
 * @route   GET /api/students
 * @access  Private (Admin/Teacher)
 */
const getStudents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { last_name: { contains: search, mode: "insensitive" } },
            { user: { email: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {};

    const total = await prisma.students.count({ where });

    const students = await prisma.students.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
        parent: {
          select: {
            name: true,
            last_name: true,
            phone: true,
          },
        },
      },
      orderBy: {
        last_name: "asc",
      },
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      students,
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
 * getStudentById
 * ==============
 * Obtiene un estudiante específico con TODA su información relacionada
 *
 * @route   GET /api/students/:id
 * @access  Private
 */
const getStudentById = async (req, res, next) => {
  try {
    const student = await prisma.students.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
        parent: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
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
      },
    });

    if (!student) {
      res.status(404);
      throw new Error("Estudiante no encontrado");
    }

    res.json(student);
  } catch (error) {
    next(error);
  }
};

/**
 * updateStudent
 * =============
 * Actualiza los datos de un estudiante
 *
 * @route   PUT /api/students/:id
 * @access  Private (Admin)
 */
const updateStudent = async (req, res, next) => {
  try {
    const { name, last_name, birth_date, gender, address, phone, parent_id } =
      req.body;

    const studentExists = await prisma.students.findUnique({
      where: { id: req.params.id },
    });

    if (!studentExists) {
      res.status(404);
      throw new Error("Estudiante no encontrado");
    }

    const updated = await prisma.students.update({
      where: { id: req.params.id },
      data: {
        name,
        last_name,
        birth_date: birth_date ? new Date(birth_date) : undefined,
        gender,
        address,
        phone,
        parent_id,
      },
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
        parent: true,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * deleteStudent
 * =============
 * Elimina un estudiante y su usuario asociado
 *
 * @route   DELETE /api/students/:id
 * @access  Private (Admin)
 */
const deleteStudent = async (req, res, next) => {
  try {
    const student = await prisma.students.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!student) {
      res.status(404);
      throw new Error("Estudiante no encontrado");
    }

    await prisma.users.delete({
      where: { id: student.user_id },
    });

    res.json({ message: "Estudiante eliminado correctamente" });
  } catch (error) {
    next(error);
  }
};

/**
 * getStudentCredentials
 * =====================
 * Obtiene el QR y PIN de un estudiante para asistencia
 *
 * @route   GET /api/students/:id/credentials
 * @access  Private
 */
const getStudentCredentials = async (req, res, next) => {
  try {
    const student = await prisma.students.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        last_name: true,
        qr_code: true,
        pin_code: true,
      },
    });

    if (!student) {
      res.status(404);
      throw new Error("Estudiante no encontrado");
    }

    res.json(student);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentCredentials,
};
