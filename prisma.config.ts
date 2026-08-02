import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const appUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || "postgresql://postgres:postgres@localhost:5432/postgres";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: appUrl,
  },
});
