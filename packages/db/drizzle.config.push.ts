import { defineConfig } from "drizzle-kit";

/**
 * Applies the schema to a real (non-test) database.
 *
 * Uses `src/test/helpers/test-schema.ts` rather than `src/schema.ts` directly.
 * That module re-exports the real schema but blanks out `usersInAuth`, which is
 * declared as `pgTable("auth.users", ...)` -- a literal table name, not a
 * schema-qualified one. Pushing it creates a `public."auth.users"` table whose
 * primary key collides with `public.users`' own `users_pkey`, so the push
 * aborts partway through. Supabase owns the real `auth.users`, so excluding it
 * here is correct.
 *
 * Run `db:bootstrap` first: it installs the extensions, roles, and helper
 * functions that schema.ts references but Supabase normally provides.
 */
export default defineConfig({
  schema: "./src/test/helpers/test-schema.ts",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_SESSION_POOLER!,
  },
});
