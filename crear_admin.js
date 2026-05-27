const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const user = await prisma.users.create({
    data: {
      email: "admin@sistema.com",
      password: hashedPassword,
      role: "ADMIN",
      admin: {
        create: {
          name: "Administrador",
        },
      },
    },
  });

  console.log("Usuario admin creado:", user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
