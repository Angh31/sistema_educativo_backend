// ====================================
// CONTROLADOR DE PERFILES
// ====================================
// Maneja operaciones de perfil de usuario

const prisma = require("../db");
const bcrypt = require("bcryptjs");

/**
 * getMyProfile
 * ============
 * Obtiene el perfil del usuario autenticado
 *
 * @route   GET /api/profile
 * @access  Private (todos los roles)
 */
const getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Obtener usuario base
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        created_at: true,
      },
    });

    if (!user) {
      res.status(404);
      throw new Error("Usuario no encontrado");
    }

    let profile = { ...user };

    // Obtener datos específicos según el rol
    switch (userRole) {
      case "STUDENT":
        const student = await prisma.students.findUnique({
          where: { user_id: userId },
          include: {
            parent: {
              select: {
                id: true,
                name: true,
                last_name: true,
                phone: true,
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        });
        profile.student = student;
        break;

      case "TEACHER":
        const teacher = await prisma.teachers.findUnique({
          where: { user_id: userId },
        });
        profile.teacher = teacher;
        break;

      case "PARENT":
        const parent = await prisma.parents.findUnique({
          where: { user_id: userId },
          include: {
            students: {
              select: {
                id: true,
                name: true,
                last_name: true,
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        });
        profile.parent = parent;
        break;

      case "ADMIN":
        // Admin no tiene tabla adicional
        profile.admin = {
          name: "Administrador",
          last_name: "del Sistema",
        };
        break;
    }

    res.json(profile);
  } catch (error) {
    next(error);
  }
};

/**
 * updateMyProfile
 * ===============
 * Actualiza el perfil del usuario autenticado
 *
 * @route   PUT /api/profile
 * @access  Private (todos los roles)
 */
const updateMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { name, last_name, phone, address, specialty, birth_date, gender } =
      req.body;

    // Actualizar según el rol
    let updated;

    switch (userRole) {
      case "STUDENT":
        const student = await prisma.students.findUnique({
          where: { user_id: userId },
        });

        if (!student) {
          res.status(404);
          throw new Error("Estudiante no encontrado");
        }

        updated = await prisma.students.update({
          where: { id: student.id },
          data: {
            name,
            last_name,
            phone,
            address,
            birth_date: birth_date ? new Date(birth_date) : undefined,
            gender,
          },
        });
        break;

      case "TEACHER":
        const teacher = await prisma.teachers.findUnique({
          where: { user_id: userId },
        });

        if (!teacher) {
          res.status(404);
          throw new Error("Profesor no encontrado");
        }

        updated = await prisma.teachers.update({
          where: { id: teacher.id },
          data: {
            name,
            last_name,
            phone,
            specialty,
          },
        });
        break;

      case "PARENT":
        const parent = await prisma.parents.findUnique({
          where: { user_id: userId },
        });

        if (!parent) {
          res.status(404);
          throw new Error("Padre no encontrado");
        }

        updated = await prisma.parents.update({
          where: { id: parent.id },
          data: {
            name,
            last_name,
            phone,
            address,
          },
        });
        break;

      case "ADMIN":
        res.status(400);
        throw new Error("Los administradores no pueden editar su perfil");

      default:
        res.status(400);
        throw new Error("Rol no válido");
    }

    res.json({
      message: "Perfil actualizado exitosamente",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * changePassword
 * ==============
 * Cambia la contraseña del usuario autenticado
 *
 * @route   PUT /api/profile/password
 * @access  Private (todos los roles)
 */
const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validar campos requeridos
    if (!currentPassword || !newPassword) {
      res.status(400);
      throw new Error("Contraseña actual y nueva contraseña son requeridas");
    }

    // Validar longitud de nueva contraseña
    if (newPassword.length < 6) {
      res.status(400);
      throw new Error("La nueva contraseña debe tener al menos 6 caracteres");
    }

    // Obtener usuario con contraseña
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404);
      throw new Error("Usuario no encontrado");
    }

    // Verificar contraseña actual
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      res.status(401);
      throw new Error("Contraseña actual incorrecta");
    }

    // Hash de la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Actualizar contraseña
    await prisma.users.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ message: "Contraseña cambiada exitosamente" });
  } catch (error) {
    next(error);
  }
};

/**
 * updateEmail
 * ===========
 * Actualiza el email del usuario autenticado
 *
 * @route   PUT /api/profile/email
 * @access  Private (todos los roles)
 */
const updateEmail = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { email, password } = req.body;

    // Validar campos requeridos
    if (!email || !password) {
      res.status(400);
      throw new Error("Email y contraseña son requeridos");
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400);
      throw new Error("Formato de email inválido");
    }

    // Obtener usuario
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404);
      throw new Error("Usuario no encontrado");
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(401);
      throw new Error("Contraseña incorrecta");
    }

    // Verificar que el email no esté en uso
    const emailExists = await prisma.users.findUnique({
      where: { email },
    });

    if (emailExists && emailExists.id !== userId) {
      res.status(400);
      throw new Error("Este email ya está en uso");
    }

    // Actualizar email
    await prisma.users.update({
      where: { id: userId },
      data: { email },
    });

    res.json({ message: "Email actualizado exitosamente" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  changePassword,
  updateEmail,
};
