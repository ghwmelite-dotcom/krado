import path from "node:path";
import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, "migrations"));

  return {
    test: {
      include: ["test/**/*.test.ts"],
      setupFiles: ["./test/apply-migrations.ts"],
      poolOptions: {
        workers: {
          wrangler: { configPath: "./wrangler.toml" },
          miniflare: {
            bindings: {
              TEST_MIGRATIONS: migrations,
              PAYSTACK_SECRET_KEY: "sk_test_secret",
              PAYSTACK_WEBHOOK_SECRET: "whsec_test",
              SESSION_SIGNING_KEY: "test_signing_key",
              WA_VERIFY_TOKEN: "test_verify",
            },
          },
        },
      },
    },
  };
});
