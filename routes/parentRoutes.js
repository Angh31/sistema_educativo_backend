// ====================================
// RUTAS DE PADRES
// ====================================

const express = require("express");
const router = express.Router();
const {
  getParents,
  getParentById,
  updateParent,
  deleteParent,
  getChildrenSummary,
} = require("../controllers/parentController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Obtener todos los padres (solo Admin)
router.get("/", protect, authorize("ADMIN"), getParents);

// Obtener padre por ID (todos los roles autenticados)
router.get("/:id", protect, getParentById);

// Obtener resumen de hijos (todos los roles autenticados)
router.get("/:id/children-summary", protect, getChildrenSummary);

// Actualizar padre (solo Admin)
router.put("/:id", protect, authorize("ADMIN"), updateParent);

// Eliminar padre (solo Admin)
router.delete("/:id", protect, authorize("ADMIN"), deleteParent);

const prisma = require("../db");

// Obtener detalles de un hijo (para padres)
router.get(
  "/child/:studentId",
  protect,
  authorize("PARENT"),
  async (req, res) => {
    try {
      const { studentId } = req.params;

      // Verificar que el estudiante es hijo del padre
      const parent = await prisma.parents.findUnique({
        where: { user_id: req.user.id },
        include: { students: true },
      });

      if (!parent?.students?.some((s) => s.id === studentId)) {
        return res
          .status(403)
          .json({ error: "No tienes acceso a este estudiante" });
      }

      const student = await prisma.students.findUnique({
        where: { id: studentId },
        include: {
          user: { select: { email: true } },
          enrollments: {
            include: {
              course: {
                include: {
                  teacher: { select: { name: true, last_name: true } },
                  schedules: true,
                },
              },
            },
          },
          grades: {
            take: 10,
            orderBy: { created_at: "desc" },
            include: { course: true },
          },
          attendance: {
            take: 20,
            orderBy: { date: "desc" },
            include: { course: true },
          },
        },
      });

      const avg =
        student.grades.length > 0
          ? student.grades.reduce((s, g) => s + parseFloat(g.grade), 0) /
            student.grades.length
          : 0;

      const attRate =
        student.attendance.length > 0
          ? (student.attendance.filter((a) => a.status === "PRESENT").length /
              student.attendance.length) *
            100
          : 0;

      res.json({
        student: {
          id: student.id,
          name: student.name,
          last_name: student.last_name,
        },
        courses: student.enrollments,
        average: avg.toFixed(2),
        attendance_rate: attRate.toFixed(1),
        latest_grades: student.grades,
        latest_attendance: student.attendance,
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Error al obtener detalles" });
    }
  }
);

module.exports = router;
