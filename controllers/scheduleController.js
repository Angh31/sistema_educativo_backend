// ====================================
// CONTROLADOR DE HORARIOS
// ====================================
// Maneja todas las operaciones CRUD de horarios/schedules

const prisma = require("../db");

/**
 * getSchedules
 * ============
 * Obtiene todos los horarios del sistema
 *
 * @route   GET /api/schedules
 * @access  Private (Admin/Teacher)
 */
const getSchedules = async (req, res, next) => {
  try {
    const schedules = await prisma.schedules.findMany({
      include: {
        course: {
          include: {
            teacher: true,
          },
        },
      },
      orderBy: [{ day_week: "asc" }, { start_time: "asc" }],
    });

    res.json(schedules);
  } catch (error) {
    next(error);
  }
};

/**
 * getScheduleById
 * ===============
 * Obtiene un horario específico
 *
 * @route   GET /api/schedules/:id
 * @access  Private
 */
const getScheduleById = async (req, res, next) => {
  try {
    const schedule = await prisma.schedules.findUnique({
      where: { id: req.params.id },
      include: {
        course: {
          include: {
            teacher: true,
          },
        },
      },
    });

    if (!schedule) {
      res.status(404);
      throw new Error("Horario no encontrado");
    }

    res.json(schedule);
  } catch (error) {
    next(error);
  }
};

/**
 * getSchedulesByCourse
 * ====================
 * Obtiene todos los horarios de un curso específico
 *
 * @route   GET /api/schedules/course/:courseId
 * @access  Private
 */
const getSchedulesByCourse = async (req, res, next) => {
  try {
    const schedules = await prisma.schedules.findMany({
      where: { course_id: req.params.courseId },
      include: {
        course: {
          include: {
            teacher: true,
          },
        },
      },
      orderBy: [{ day_week: "asc" }, { start_time: "asc" }],
    });

    res.json(schedules);
  } catch (error) {
    next(error);
  }
};

/**
 * createSchedule
 * ==============
 * Crea un nuevo horario
 *
 * @route   POST /api/schedules
 * @access  Private (Admin)
 */
const createSchedule = async (req, res, next) => {
  try {
    const { course_id, day_week, start_time, end_time, classroom } = req.body;

    // ===== VALIDAR CAMPOS REQUERIDOS =====
    if (!course_id || !day_week || !start_time || !end_time) {
      res.status(400);
      throw new Error(
        "course_id, day_week, start_time y end_time son requeridos"
      );
    }

    // ===== VALIDAR QUE EL CURSO EXISTE =====
    const courseExists = await prisma.courses.findUnique({
      where: { id: course_id },
    });

    if (!courseExists) {
      res.status(404);
      throw new Error("Curso no encontrado");
    }

    // ===== VALIDAR FORMATO DE HORA =====
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      res.status(400);
      throw new Error("Formato de hora inválido. Use HH:MM (24 horas)");
    }

    // ===== VALIDAR QUE START_TIME < END_TIME =====
    if (start_time >= end_time) {
      res.status(400);
      throw new Error("La hora de inicio debe ser menor que la hora de fin");
    }

    // ===== VALIDAR DÍA DE LA SEMANA =====
    const validDays = [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ];
    if (!validDays.includes(day_week)) {
      res.status(400);
      throw new Error("Día de la semana inválido");
    }

    // ===== VERIFICAR CONFLICTO DE HORARIO =====
    // Conflicto: Mismo docente, mismo día, horarios que se solapan
    const teacherId = courseExists.teacher_id;

    const conflictingSchedules = await prisma.schedules.findMany({
      where: {
        day_week: day_week,
        course: {
          teacher_id: teacherId,
        },
        OR: [
          // El nuevo horario empieza durante un horario existente
          {
            AND: [
              { start_time: { lte: start_time } },
              { end_time: { gt: start_time } },
            ],
          },
          // El nuevo horario termina durante un horario existente
          {
            AND: [
              { start_time: { lt: end_time } },
              { end_time: { gte: end_time } },
            ],
          },
          // El nuevo horario contiene completamente un horario existente
          {
            AND: [
              { start_time: { gte: start_time } },
              { end_time: { lte: end_time } },
            ],
          },
        ],
      },
      include: {
        course: true,
      },
    });

    if (conflictingSchedules.length > 0) {
      res.status(400);
      throw new Error(
        `Conflicto de horario: El docente ya tiene clase el ${day_week} de ${conflictingSchedules[0].start_time} a ${conflictingSchedules[0].end_time} (${conflictingSchedules[0].course.name})`
      );
    }

    // ===== VERIFICAR CONFLICTO DE SALÓN (si se especificó) =====
    if (classroom) {
      const classroomConflicts = await prisma.schedules.findMany({
        where: {
          day_week: day_week,
          classroom: classroom,
          OR: [
            {
              AND: [
                { start_time: { lte: start_time } },
                { end_time: { gt: start_time } },
              ],
            },
            {
              AND: [
                { start_time: { lt: end_time } },
                { end_time: { gte: end_time } },
              ],
            },
            {
              AND: [
                { start_time: { gte: start_time } },
                { end_time: { lte: end_time } },
              ],
            },
          ],
        },
        include: {
          course: true,
        },
      });

      if (classroomConflicts.length > 0) {
        res.status(400);
        throw new Error(
          `Conflicto de salón: El salón ${classroom} ya está ocupado el ${day_week} de ${classroomConflicts[0].start_time} a ${classroomConflicts[0].end_time} (${classroomConflicts[0].course.name})`
        );
      }
    }

    // ===== CREAR HORARIO =====
    const schedule = await prisma.schedules.create({
      data: {
        course_id,
        day_week,
        start_time,
        end_time,
        classroom,
      },
      include: {
        course: {
          include: {
            teacher: true,
          },
        },
      },
    });

    res.status(201).json(schedule);
  } catch (error) {
    next(error);
  }
};

/**
 * updateSchedule
 * ==============
 * Actualiza un horario existente
 *
 * @route   PUT /api/schedules/:id
 * @access  Private (Admin)
 */
const updateSchedule = async (req, res, next) => {
  try {
    const { course_id, day_week, start_time, end_time, classroom } = req.body;

    // ===== VERIFICAR QUE EL HORARIO EXISTE =====
    const scheduleExists = await prisma.schedules.findUnique({
      where: { id: req.params.id },
      include: {
        course: true,
      },
    });

    if (!scheduleExists) {
      res.status(404);
      throw new Error("Horario no encontrado");
    }

    // ===== VALIDAR FORMATO DE HORA =====
    if (start_time || end_time) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (start_time && !timeRegex.test(start_time)) {
        res.status(400);
        throw new Error("Formato de start_time inválido. Use HH:MM");
      }
      if (end_time && !timeRegex.test(end_time)) {
        res.status(400);
        throw new Error("Formato de end_time inválido. Use HH:MM");
      }
    }

    // ===== VALIDAR QUE START_TIME < END_TIME =====
    const finalStartTime = start_time || scheduleExists.start_time;
    const finalEndTime = end_time || scheduleExists.end_time;

    if (finalStartTime >= finalEndTime) {
      res.status(400);
      throw new Error("La hora de inicio debe ser menor que la hora de fin");
    }

    // ===== VALIDAR DÍA DE LA SEMANA =====
    if (day_week) {
      const validDays = [
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "SUNDAY",
      ];
      if (!validDays.includes(day_week)) {
        res.status(400);
        throw new Error("Día de la semana inválido");
      }
    }

    // ===== VERIFICAR CONFLICTOS (excluyendo este horario) =====
    const finalDayWeek = day_week || scheduleExists.day_week;
    const finalCourseId = course_id || scheduleExists.course_id;

    // Obtener info del curso
    const course = await prisma.courses.findUnique({
      where: { id: finalCourseId },
    });

    const conflictingSchedules = await prisma.schedules.findMany({
      where: {
        id: { not: req.params.id }, // Excluir el horario actual
        day_week: finalDayWeek,
        course: {
          teacher_id: course.teacher_id,
        },
        OR: [
          {
            AND: [
              { start_time: { lte: finalStartTime } },
              { end_time: { gt: finalStartTime } },
            ],
          },
          {
            AND: [
              { start_time: { lt: finalEndTime } },
              { end_time: { gte: finalEndTime } },
            ],
          },
          {
            AND: [
              { start_time: { gte: finalStartTime } },
              { end_time: { lte: finalEndTime } },
            ],
          },
        ],
      },
      include: {
        course: true,
      },
    });

    if (conflictingSchedules.length > 0) {
      res.status(400);
      throw new Error(
        `Conflicto de horario: El docente ya tiene clase el ${finalDayWeek} de ${conflictingSchedules[0].start_time} a ${conflictingSchedules[0].end_time}`
      );
    }

    // ===== ACTUALIZAR HORARIO =====
    const updated = await prisma.schedules.update({
      where: { id: req.params.id },
      data: {
        course_id,
        day_week,
        start_time,
        end_time,
        classroom,
      },
      include: {
        course: {
          include: {
            teacher: true,
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
 * deleteSchedule
 * ==============
 * Elimina un horario
 *
 * @route   DELETE /api/schedules/:id
 * @access  Private (Admin)
 */
const deleteSchedule = async (req, res, next) => {
  try {
    const schedule = await prisma.schedules.findUnique({
      where: { id: req.params.id },
    });

    if (!schedule) {
      res.status(404);
      throw new Error("Horario no encontrado");
    }

    await prisma.schedules.delete({
      where: { id: req.params.id },
    });

    res.json({ message: "Horario eliminado correctamente" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSchedules,
  getScheduleById,
  getSchedulesByCourse,
  createSchedule,
  updateSchedule,
  deleteSchedule,
};
