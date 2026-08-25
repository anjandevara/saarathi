/**
 * support/env.ts
 *
 * One simple job: figure out which environment we are running against
 * (local, dev, qa, prod) and load its settings.
 *
 * How the environment is picked:
 *   TEST_ENV=dev npx playwright test
 * If TEST_ENV is not set, it defaults to "local".
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

export type EnvName = 'local' | 'dev' | 'qa' | 'prod';

const envName = (process.env.TEST_ENV || 'local') as EnvName;

// Secrets (Amazon Web Services keys, the S3 bucket name) live in a root
// .env file that is never checked into the repository. Loading it here,
// before the per-environment file, means every environment gets the same
// secrets without repeating them. In CI/CD this file will not exist, and
// that is fine: dotenv.config() on a missing file does nothing, and the
// pipeline's own environment variables (set directly in its settings)
// are used instead.
const secretsFilePath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(secretsFilePath)) {
  dotenv.config({ path: secretsFilePath });
}

const envFilePath = path.resolve(__dirname, '..', 'config', 'environments', `${envName}.env`);

if (!fs.existsSync(envFilePath)) {
  throw new Error(
    `No environment file found for TEST_ENV="${envName}". ` +
      `Expected to find it at: ${envFilePath}. ` +
      `Valid options are: local, dev, qa, prod.`
  );
}

dotenv.config({ path: envFilePath });

// Special case: "local" runs against the demo page shipped in this repo,
// so we build its file:// path in code instead of hard-coding a machine
// path inside a .env file.
const demoAppPath = path.resolve(__dirname, '..', 'demo-app', 'index.html');
const resolvedBaseUrl =
  envName === 'local' ? `file://${demoAppPath}` : process.env.BASE_URL || '';

if (!resolvedBaseUrl) {
  throw new Error(
    `BASE_URL is empty for TEST_ENV="${envName}". ` +
      `Set it in config/environments/${envName}.env`
  );
}

export const env = {
  name: envName,
  baseUrl: resolvedBaseUrl,
};
