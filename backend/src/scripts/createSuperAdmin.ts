import { createInterface } from 'node:readline/promises';
import { connectMongo, disconnectMongo } from '../core/db/index.js';
import { logger } from '../core/logger/index.js';
import { hashPassword } from '../core/security/index.js';
import { UserModel } from '../modules/users/users.model.js';
import { emailSchema, fullNameSchema, passwordSchema } from '../shared/schemas.js';

/**
 * Bootstraps the very first `SUPER_ADMIN`.
 *
 * This exists as a script rather than an API route on purpose: an endpoint that
 * mints a super admin is a permanent backdoor, however carefully it is guarded.
 * Creating the first one requires shell access to the server.
 *
 *   npm run create:superadmin
 *   npm run create:superadmin -- --email a@b.com --name "Manas" --password '…'
 */
interface Args {
  email?: string;
  name?: string;
  password?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (value === undefined) continue;
    if (key === '--email') args.email = value;
    if (key === '--name') args.name = value;
    if (key === '--password') args.password = value;
  }
  return args;
}

async function prompt(question: string, existing: string | undefined): Promise<string> {
  if (existing) return existing;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const email = emailSchema.parse(await prompt('Email: ', args.email));
  const fullName = fullNameSchema.parse(await prompt('Full name: ', args.name));
  const password = passwordSchema.parse(await prompt('Password (min 12 chars): ', args.password));

  await connectMongo();

  const existing = await UserModel.findOne({ email }).lean().exec();
  if (existing) {
    throw new Error(`A user with email ${email} already exists`);
  }

  const created = await UserModel.create({
    email,
    fullName,
    passwordHash: await hashPassword(password),
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    preferredLanguage: 'en',
  });

  logger.info({ id: created._id.toString(), email }, 'SUPER_ADMIN created');
}

try {
  await main();
  await disconnectMongo();
  process.exit(0);
} catch (error) {
  logger.fatal({ err: error }, 'Failed to create super admin');
  await disconnectMongo().catch(() => undefined);
  process.exit(1);
}
