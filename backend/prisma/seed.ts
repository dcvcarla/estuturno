import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@test.com";
  const password = "admin123";
  const passwordHash = await bcrypt.hash(password, 10);

  const commerce = await prisma.commerce.upsert({
    where: { dominio: "estuturno-backend.onrender.com" },
    update: {},
    create: {
      nombre: "Mi Comercio",
      dominio: "estuturno-backend.onrender.com",
      telefonoWhatsapp: "+5491123456789",
      configuracionHorarios: JSON.stringify({
        lunes: [{ inicio: "09:00", fin: "18:00" }],
        martes: [{ inicio: "09:00", fin: "18:00" }],
        miercoles: [{ inicio: "09:00", fin: "18:00" }],
        jueves: [{ inicio: "09:00", fin: "18:00" }],
        viernes: [{ inicio: "09:00", fin: "18:00" }],
        sabado: [{ inicio: "09:00", fin: "14:00" }],
      }),
    },
  });

  const existingServices = await prisma.service.count({ where: { commerceId: commerce.id } });
  if (existingServices === 0) {
    await prisma.service.createMany({
      data: [
        { commerceId: commerce.id, nombre: "Corte de cabello", duracionMinutos: 30, precio: 1500, montoSena: 500 },
        { commerceId: commerce.id, nombre: "Depilacion", duracionMinutos: 45, precio: 2500, montoSena: null },
        { commerceId: commerce.id, nombre: "Manicuria", duracionMinutos: 60, precio: 2000, montoSena: null },
      ],
    });
  }

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      commerceId: commerce.id,
      email: adminEmail,
      passwordHash,
      nombre: "Admin",
    },
  });

  // Also create for localhost testing
  const localCommerce = await prisma.commerce.upsert({
    where: { dominio: "localhost" },
    update: {},
    create: {
      nombre: "Mi Comercio (Local)",
      dominio: "localhost",
      telefonoWhatsapp: "+5491123456789",
      configuracionHorarios: JSON.stringify({
        lunes: [{ inicio: "09:00", fin: "18:00" }],
        martes: [{ inicio: "09:00", fin: "18:00" }],
        miercoles: [{ inicio: "09:00", fin: "18:00" }],
        jueves: [{ inicio: "09:00", fin: "18:00" }],
        viernes: [{ inicio: "09:00", fin: "18:00" }],
        sabado: [{ inicio: "09:00", fin: "14:00" }],
      }),
    },
  });

  await prisma.admin.upsert({
    where: { email: "local@test.com" },
    update: {},
    create: {
      commerceId: localCommerce.id,
      email: "local@test.com",
      passwordHash,
      nombre: "Admin Local",
    },
  });

  console.log("Seed completado:");
  console.log(`  Comercio (Render): ${commerce.dominio}`);
  console.log(`  Admin: ${adminEmail} / ${password}`);
  console.log(`  Admin local: local@test.com / ${password}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
