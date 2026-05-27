const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de datos...");

  // Limpiar datos existentes
  await prisma.grades.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.enrollments.deleteMany();
  await prisma.schedules.deleteMany();
  await prisma.courses.deleteMany();
  await prisma.students.deleteMany();
  await prisma.teachers.deleteMany();
  await prisma.parents.deleteMany();
  await prisma.admins.deleteMany();
  await prisma.users.deleteMany();

  // Hashear contraseña (123456 para todos)
  const hashedPassword = await bcrypt.hash("123456", 10);

  // ==========================================
  // 1. CREAR ADMINISTRADOR
  // ==========================================
  console.log("👤 Creando administrador...");
  const adminUser = await prisma.users.create({
    data: {
      email: "admin@escuela.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  await prisma.admins.create({
    data: {
      user_id: adminUser.id,
      name: "Administrador Principal",
    },
  });

  console.log("✅ Admin creado: admin@escuela.com");

  // ==========================================
  // 2. CREAR PADRES
  // ==========================================
  console.log("👪 Creando padres...");

  // Padre 1: Carlos Pérez
  const parentUser1 = await prisma.users.create({
    data: {
      email: "carlos.perez@escuela.com",
      password: hashedPassword,
      role: "PARENT",
    },
  });

  const parent1 = await prisma.parents.create({
    data: {
      user_id: parentUser1.id,
      name: "Carlos",
      last_name: "Pérez",
      phone: "1234-5678",
    },
  });

  console.log("✅ Padre creado: carlos.perez@escuela.com");

  // Padre 2: María López
  const parentUser2 = await prisma.users.create({
    data: {
      email: "maria.lopez@escuela.com",
      password: hashedPassword,
      role: "PARENT",
    },
  });

  const parent2 = await prisma.parents.create({
    data: {
      user_id: parentUser2.id,
      name: "María",
      last_name: "López",
      phone: "8765-4321",
    },
  });

  console.log("✅ Padre creado: maria.lopez@escuela.com");

  // ==========================================
  // 3. CREAR DOCENTES
  // ==========================================
  console.log("👨‍🏫 Creando docentes...");

  // Docente 1: María González
  const teacherUser1 = await prisma.users.create({
    data: {
      email: "maria.gonzalez@escuela.com",
      password: hashedPassword,
      role: "TEACHER",
    },
  });

  const teacher1 = await prisma.teachers.create({
    data: {
      user_id: teacherUser1.id,
      name: "María",
      last_name: "González",
      specialty: "Matemáticas",
      phone: "5555-0001",
    },
  });

  console.log("✅ Docente creado: maria.gonzalez@escuela.com");

  // Docente 2: Pedro Ramírez
  const teacherUser2 = await prisma.users.create({
    data: {
      email: "pedro.ramirez@escuela.com",
      password: hashedPassword,
      role: "TEACHER",
    },
  });

  const teacher2 = await prisma.teachers.create({
    data: {
      user_id: teacherUser2.id,
      name: "Pedro",
      last_name: "Ramírez",
      specialty: "Ciencias",
      phone: "5555-0002",
    },
  });

  console.log("✅ Docente creado: pedro.ramirez@escuela.com");

  // Docente 3: Laura Fernández
  const teacherUser3 = await prisma.users.create({
    data: {
      email: "laura.fernandez@escuela.com",
      password: hashedPassword,
      role: "TEACHER",
    },
  });

  const teacher3 = await prisma.teachers.create({
    data: {
      user_id: teacherUser3.id,
      name: "Laura",
      last_name: "Fernández",
      specialty: "Español",
      phone: "5555-0003",
    },
  });

  console.log("✅ Docente creado: laura.fernandez@escuela.com");

  const teachers = [teacher1, teacher2, teacher3];

  // ==========================================
  // 4. CREAR ESTUDIANTES
  // ==========================================
  console.log("👨‍🎓 Creando estudiantes...");

  // Estudiante 1: Juan Pérez (hijo de Carlos Pérez)
  const studentUser1 = await prisma.users.create({
    data: {
      email: "juan.perez@escuela.com",
      password: hashedPassword,
      role: "STUDENT",
    },
  });

  const student1 = await prisma.students.create({
    data: {
      user_id: studentUser1.id,
      name: "Juan",
      last_name: "Pérez",
      birth_date: new Date("2010-05-15"),
      gender: "M",
      address: "Calle Principal 123",
      phone: "1111-2222",
      qr_code: `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pin_code: "123456",
      parent_id: parent1.id,
    },
  });

  console.log("✅ Estudiante creado: juan.perez@escuela.com");

  // Estudiante 2: Ana López (hija de María López)
  const studentUser2 = await prisma.users.create({
    data: {
      email: "ana.lopez@escuela.com",
      password: hashedPassword,
      role: "STUDENT",
    },
  });

  const student2 = await prisma.students.create({
    data: {
      user_id: studentUser2.id,
      name: "Ana",
      last_name: "López",
      birth_date: new Date("2011-03-20"),
      gender: "F",
      address: "Avenida Central 456",
      phone: "3333-4444",
      qr_code: `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pin_code: "234567",
      parent_id: parent2.id,
    },
  });

  console.log("✅ Estudiante creado: ana.lopez@escuela.com");

  // Estudiante 3: Luis García (sin padre)
  const studentUser3 = await prisma.users.create({
    data: {
      email: "luis.garcia@escuela.com",
      password: hashedPassword,
      role: "STUDENT",
    },
  });

  const student3 = await prisma.students.create({
    data: {
      user_id: studentUser3.id,
      name: "Luis",
      last_name: "García",
      birth_date: new Date("2010-08-10"),
      gender: "M",
      address: "Boulevard Norte 789",
      phone: "5555-6666",
      qr_code: `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pin_code: "345678",
      parent_id: null,
    },
  });

  console.log("✅ Estudiante creado: luis.garcia@escuela.com");

  // Estudiante 4: Sofía Hernández (sin padre)
  const studentUser4 = await prisma.users.create({
    data: {
      email: "sofia.hernandez@escuela.com",
      password: hashedPassword,
      role: "STUDENT",
    },
  });

  const student4 = await prisma.students.create({
    data: {
      user_id: studentUser4.id,
      name: "Sofía",
      last_name: "Hernández",
      birth_date: new Date("2011-12-05"),
      gender: "F",
      address: "Calle del Sol 321",
      phone: "7777-8888",
      qr_code: `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pin_code: "456789",
      parent_id: null,
    },
  });

  console.log("✅ Estudiante creado: sofia.hernandez@escuela.com");

  const students = [student1, student2, student3, student4];

  // ==========================================
  // 5. CREAR CURSOS
  // ==========================================
  console.log("📚 Creando cursos...");

  const course1 = await prisma.courses.create({
    data: {
      name: "Matemáticas I",
      description: "Álgebra básica y geometría",
      teacher_id: teacher1.id,
      grade_level: 1,
    },
  });

  const course2 = await prisma.courses.create({
    data: {
      name: "Ciencias Naturales",
      description: "Biología y física básica",
      teacher_id: teacher2.id,
      grade_level: 1,
    },
  });

  const course3 = await prisma.courses.create({
    data: {
      name: "Español",
      description: "Gramática y literatura",
      teacher_id: teacher3.id,
      grade_level: 1,
    },
  });

  const course4 = await prisma.courses.create({
    data: {
      name: "Matemáticas II",
      description: "Geometría avanzada",
      teacher_id: teacher1.id,
      grade_level: 2,
    },
  });

  const course5 = await prisma.courses.create({
    data: {
      name: "Física",
      description: "Física básica",
      teacher_id: teacher2.id,
      grade_level: 2,
    },
  });

  const courses = [course1, course2, course3, course4, course5];
  console.log(`✅ ${courses.length} cursos creados`);

  // ==========================================
  // 6. CREAR HORARIOS
  // ==========================================
  console.log("📅 Creando horarios...");

  await prisma.schedules.create({
    data: {
      course_id: course1.id,
      day_week: "MONDAY",
      start_time: "08:00",
      end_time: "10:00",
      classroom: "Aula 101",
    },
  });

  await prisma.schedules.create({
    data: {
      course_id: course1.id,
      day_week: "WEDNESDAY",
      start_time: "08:00",
      end_time: "10:00",
      classroom: "Aula 101",
    },
  });

  await prisma.schedules.create({
    data: {
      course_id: course2.id,
      day_week: "TUESDAY",
      start_time: "10:00",
      end_time: "12:00",
      classroom: "Lab. Ciencias",
    },
  });

  await prisma.schedules.create({
    data: {
      course_id: course2.id,
      day_week: "THURSDAY",
      start_time: "10:00",
      end_time: "12:00",
      classroom: "Lab. Ciencias",
    },
  });

  await prisma.schedules.create({
    data: {
      course_id: course3.id,
      day_week: "FRIDAY",
      start_time: "08:00",
      end_time: "10:00",
      classroom: "Aula 102",
    },
  });

  console.log("✅ Horarios creados");

  // ==========================================
  // 7. CREAR INSCRIPCIONES
  // ==========================================
  console.log("📝 Creando inscripciones...");

  // Juan Pérez en 3 cursos
  await prisma.enrollments.create({
    data: { student_id: student1.id, course_id: course1.id },
  });
  await prisma.enrollments.create({
    data: { student_id: student1.id, course_id: course2.id },
  });
  await prisma.enrollments.create({
    data: { student_id: student1.id, course_id: course3.id },
  });

  // Ana López en 3 cursos
  await prisma.enrollments.create({
    data: { student_id: student2.id, course_id: course1.id },
  });
  await prisma.enrollments.create({
    data: { student_id: student2.id, course_id: course3.id },
  });
  await prisma.enrollments.create({
    data: { student_id: student2.id, course_id: course4.id },
  });

  // Luis García en 2 cursos
  await prisma.enrollments.create({
    data: { student_id: student3.id, course_id: course2.id },
  });
  await prisma.enrollments.create({
    data: { student_id: student3.id, course_id: course5.id },
  });

  // Sofía Hernández en 3 cursos
  await prisma.enrollments.create({
    data: { student_id: student4.id, course_id: course1.id },
  });
  await prisma.enrollments.create({
    data: { student_id: student4.id, course_id: course2.id },
  });
  await prisma.enrollments.create({
    data: { student_id: student4.id, course_id: course3.id },
  });

  console.log("✅ Inscripciones creadas");

  // ==========================================
  // 8. CREAR ASISTENCIAS
  // ==========================================
  console.log("✅ Creando asistencias...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const student of students) {
    const enrollments = await prisma.enrollments.findMany({
      where: { student_id: student.id },
    });

    for (const enrollment of enrollments) {
      // Últimos 10 días
      for (let i = 0; i < 10; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        const statuses = ["PRESENT", "PRESENT", "PRESENT", "ABSENT", "LATE"];
        const randomStatus =
          statuses[Math.floor(Math.random() * statuses.length)];

        await prisma.attendance.create({
          data: {
            student_id: student.id,
            course_id: enrollment.course_id,
            date,
            status: randomStatus,
            method: "MANUAL",
          },
        });
      }
    }
  }

  console.log("✅ Asistencias creadas");

  // ==========================================
  // 9. CREAR CALIFICACIONES
  // ==========================================
  console.log("📊 Creando calificaciones...");

  const periods = ["Primer Parcial", "Segundo Parcial", "Tercer Parcial"];

  for (const student of students) {
    const enrollments = await prisma.enrollments.findMany({
      where: { student_id: student.id },
    });

    for (const enrollment of enrollments) {
      for (const period of periods) {
        const grade = Math.floor(Math.random() * 40) + 60;

        await prisma.grades.create({
          data: {
            student_id: student.id,
            course_id: enrollment.course_id,
            grade,
            period,
            comment:
              grade >= 80
                ? "Excelente trabajo"
                : grade >= 70
                ? "Buen desempeño"
                : "Necesita mejorar",
          },
        });
      }
    }
  }

  console.log("✅ Calificaciones creadas");

  // ==========================================
  // RESUMEN
  // ==========================================
  console.log("\n✅ ¡Seed completado exitosamente!\n");
  console.log("📊 Resumen de datos creados:");
  console.log("   - 1 Administrador");
  console.log("   - 3 Docentes");
  console.log("   - 4 Estudiantes");
  console.log("   - 2 Padres");
  console.log("   - 5 Cursos");
  console.log("   - Horarios, Inscripciones, Asistencias y Calificaciones\n");
  console.log("🔑 Credenciales de prueba (password: 123456):\n");
  console.log("   👤 Admin:");
  console.log("      Email: admin@escuela.com\n");
  console.log("   👨‍🏫 Docentes:");
  console.log("      Email: maria.gonzalez@escuela.com");
  console.log("      Email: pedro.ramirez@escuela.com");
  console.log("      Email: laura.fernandez@escuela.com\n");
  console.log("   👨‍🎓 Estudiantes:");
  console.log("      Email: juan.perez@escuela.com");
  console.log("      Email: ana.lopez@escuela.com");
  console.log("      Email: luis.garcia@escuela.com");
  console.log("      Email: sofia.hernandez@escuela.com\n");
  console.log("   👪 Padres:");
  console.log("      Email: carlos.perez@escuela.com");
  console.log("      Email: maria.lopez@escuela.com\n");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
