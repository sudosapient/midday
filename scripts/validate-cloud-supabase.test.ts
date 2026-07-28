import { describe, expect, test } from "bun:test";
import { validateCloudSupabaseEnv } from "./validate-cloud-supabase";

const validEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_INTERNAL_URL: "https://example.supabase.co",
  SUPABASE_AUTH_ISSUER: "https://example.supabase.co/auth/v1",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
  SUPABASE_SECRET_KEY: "secret",
  DATABASE_PRIMARY_URL:
    "postgresql://postgres.example:password@pooler.supabase.com:5432/postgres",
  DATABASE_PRIMARY_POOLER_URL:
    "postgresql://postgres.example:password@pooler.supabase.com:5432/postgres",
  DATABASE_SESSION_POOLER:
    "postgresql://postgres.example:password@pooler.supabase.com:5432/postgres",
  R2_ENDPOINT: "https://example.storage.supabase.co/storage/v1/s3",
  R2_ACCESS_KEY_ID: "access",
  R2_SECRET_ACCESS_KEY: "storage-secret",
  R2_BUCKET_NAME: "apps",
};

describe("validateCloudSupabaseEnv", () => {
  test("accepts one complete hosted Supabase project", () => {
    expect(validateCloudSupabaseEnv(validEnv)).toEqual([]);
  });

  test("rejects mixed projects and local endpoints without exposing values", () => {
    const errors = validateCloudSupabaseEnv({
      ...validEnv,
      SUPABASE_INTERNAL_URL: "http://kong:8000",
      R2_ENDPOINT: "https://other.storage.supabase.co/storage/v1/s3",
    });

    expect(errors).toContain("SUPABASE_INTERNAL_URL must use HTTPS");
    expect(errors).toContain(
      "R2_ENDPOINT must belong to the same Supabase project",
    );
    expect(errors.join(" ")).not.toContain("kong:8000");
    expect(errors.join(" ")).not.toContain("other.storage.supabase.co");
  });

  test("reports missing variables by name", () => {
    expect(validateCloudSupabaseEnv({})).toContain(
      "NEXT_PUBLIC_SUPABASE_URL is required",
    );
  });

  test("rejects malformed public and database URLs without exposing values", () => {
    const errors = validateCloudSupabaseEnv({
      ...validEnv,
      NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
      DATABASE_PRIMARY_URL: "postgresql://secret@localhost:5432/postgres",
    });

    expect(errors).toContain("NEXT_PUBLIC_SUPABASE_URL must be a valid URL");
    expect(errors).toContain("DATABASE_PRIMARY_URL must use a hosted database");
    expect(errors.join(" ")).not.toContain("secret");
    expect(errors.join(" ")).not.toContain("localhost");
  });

  test("requires exact Supabase endpoint paths", () => {
    const errors = validateCloudSupabaseEnv({
      ...validEnv,
      SUPABASE_URL: "https://example.supabase.co/wrong",
      R2_ENDPOINT: "https://example.storage.supabase.co/wrong",
    });

    expect(errors).toContain("SUPABASE_URL must be a Supabase base URL");
    expect(errors).toContain("R2_ENDPOINT must end with /storage/v1/s3");
  });
});
