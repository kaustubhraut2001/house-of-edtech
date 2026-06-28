/**
 * scripts/create-user.ts
 *
 * Direct script to seed/upsert a user with a hashed password in the database.
 * Usage:
 *   npx tsx scripts/create-user.ts
 * Or:
 *   npx ts-node -O "{\"module\":\"commonjs\"}" scripts/create-user.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const name = process.env.ADMIN_NAME || "Admin User";
  const email = process.env.ADMIN_EMAIL || "admin@collabdocs.com";
  const password = process.env.ADMIN_PASSWORD || "AdminPassword123!";

  console.log("------------------------------------------------");
  console.log("CollabDocs Database User Creation Script");
  console.log("------------------------------------------------");
  console.log(`Target Name:     ${name}`);
  console.log(`Target Email:    ${email}`);
  console.log(`Target Password: [HIDDEN]`);

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Upsert user
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: hashedPassword,
    },
    create: {
      name,
      email,
      password: hashedPassword,
    },
  });

  console.log("------------------------------------------------");
  console.log(`Success! User "${user.name}" (${user.email}) has been created/updated.`);
  console.log(`User ID: ${user.id}`);
  console.log("You can now sign in using these credentials.");
  console.log("------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("Error creating user:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
