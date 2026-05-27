// ====================================
// MIDDLEWARE DE AUTORIZACIÓN AVANZADA
// ====================================
// Valida que los usuarios solo accedan a sus propios recursos

const prisma = require("../db");

/**
 * checkResourceOwnership
 * ======================
 * Middleware genérico para validar propiedad de recursos
 *
 * @param {string} resourceType - Tipo de recurso: 'student', 'teacher', 'course', 'parent'
 * @param {string} paramName - Nombre del parámetro en req.params (default: 'id')
 */
const checkResourceOwnership = (resourceType, paramName = "id") => {
  return async (req, res, next) => {
    try {
      const resourceId =
        req.params[paramName] || req.query[paramName] || req.body[paramName];
      const user = req.user;

      // ADMIN puede acceder a todo
      if (user.role === "ADMIN") {
        return next();
      }

      switch (resourceType) {
        // ===== VALIDAR ACCESO A ESTUDIANTE =====
        case "student":
          if (user.role === "STUDENT") {
            // Obtener el student_id del usuario
            const student = await prisma.students.findUnique({
              where: { user_id: user.id },
            });

            // Solo puede acceder a SU propio ID
            if (!student || student.id !== resourceId) {
              res.status(403);
              throw new Error(
                "No tienes permiso para acceder a este estudiante"
              );
            }
          } else if (user.role === "PARENT") {
            // Padre solo puede ver a SUS hijos
            const parent = await prisma.parents.findUnique({
              where: { user_id: user.id },
              include: { students: true },
            });

            const isHisChild = parent?.students.some(
              (s) => s.id === resourceId
            );
            if (!isHisChild) {
              res.status(403);
              throw new Error(
                "No tienes permiso para acceder a este estudiante"
              );
            }
          } else if (user.role === "TEACHER") {
            // Teacher puede ver estudiantes de SUS cursos
            const teacher = await prisma.teachers.findUnique({
              where: { user_id: user.id },
              include: {
                courses: {
                  include: {
                    enrollments: {
                      where: { student_id: resourceId },
                    },
                  },
                },
              },
            });

            const hasStudentInCourse = teacher?.courses.some(
              (c) => c.enrollments.length > 0
            );

            if (!hasStudentInCourse) {
              res.status(403);
              throw new Error(
                "No tienes permiso para acceder a este estudiante"
              );
            }
          }
          break;

        // ===== VALIDAR ACCESO A DOCENTE =====
        case "teacher":
          if (user.role === "TEACHER") {
            const teacher = await prisma.teachers.findUnique({
              where: { user_id: user.id },
            });

            if (!teacher || teacher.id !== resourceId) {
              res.status(403);
              throw new Error("No tienes permiso para acceder a este docente");
            }
          }
          break;

        // ===== VALIDAR ACCESO A CURSO =====
        case "course":
          if (user.role === "TEACHER") {
            // Teacher solo puede ver SUS cursos
            const teacher = await prisma.teachers.findUnique({
              where: { user_id: user.id },
            });

            const course = await prisma.courses.findUnique({
              where: { id: resourceId },
            });

            if (!course || course.teacher_id !== teacher.id) {
              res.status(403);
              throw new Error("No tienes permiso para acceder a este curso");
            }
          } else if (user.role === "STUDENT") {
            // Student solo puede ver cursos en los que está inscrito
            const student = await prisma.students.findUnique({
              where: { user_id: user.id },
            });

            const enrollment = await prisma.enrollments.findUnique({
              where: {
                student_id_course_id: {
                  student_id: student.id,
                  course_id: resourceId,
                },
              },
            });

            if (!enrollment) {
              res.status(403);
              throw new Error("No estás inscrito en este curso");
            }
          }
          break;

        // ===== VALIDAR ACCESO A PADRE =====
        case "parent":
          if (user.role === "PARENT") {
            const parent = await prisma.parents.findUnique({
              where: { user_id: user.id },
            });

            if (!parent || parent.id !== resourceId) {
              res.status(403);
              throw new Error("No tienes permiso para acceder a este padre");
            }
          }
          break;

        default:
          return next();
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { checkResourceOwnership };
