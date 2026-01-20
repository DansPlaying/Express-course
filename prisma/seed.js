// Utilizamos el cliente de Prisma para interactuar con la base de datos
require("dotenv").config();
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Creación de usuarios de demostración
  const users = [
    {
      name: "Usuario 1",
      email: "usuario1@ejemplo.com",
      password: "password1",
      role: "USER",
    },
    {
      name: "Usuario 2",
      email: "usuario2@ejemplo.com",
      password: "password2",
      role: "USER",
    },
    {
      name: "Usuario 3",
      email: "usuario3@ejemplo.com",
      password: "password3",
      role: "USER",
    },
  ];

  for (const user of users) {
    await prisma.user.create({
      data: user,
    });
  }

  console.log("Usuarios de demostración creados con éxito");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
