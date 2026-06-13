import fs from "node:fs";
import path from "node:path";
import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, "migrations"));
  // wrangler.toml declares an assets directory; make sure it exists even
  // when the web app hasn't been built yet.
  fs.mkdirSync(path.join(__dirname, "../web/dist"), { recursive: true });

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
              TELEGRAM_BOT_USERNAME: "KradoTestBot",
              ADMIN_PASSCODE: "test_admin_pass",
            },
          },
        },
      },
    },
  };
});
