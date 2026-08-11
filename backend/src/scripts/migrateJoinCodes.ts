import type { Types } from 'mongoose';
import { connectMongo, disconnectMongo } from '../core/db/index.js';
import { logger } from '../core/logger/index.js';
import { CommunityModel } from '../modules/communities/communities.model.js';
import { normaliseJoinCode, toDisplayCode } from '../modules/communities/joinCode.js';
import { toDevanagariCode } from '../modules/communities/joinWords.js';

/**
 * Backfills `joinCodeNormalised` and `joinCodeIsCustom` on communities created
 * before word-based join codes existed.
 *
 * Why this is needed, precisely: lookup used to match `joinCode` directly and now
 * matches `joinCodeNormalised`, which is the separator-stripped form. A community
 * written by the older code has no such field, so **its code stops resolving
 * entirely** — the member types it correctly and gets "no community found".
 *
 * Safe to run repeatedly. It only touches documents that are missing the field,
 * so a second run is a no-op rather than a rewrite.
 *
 *   npm run migrate:joincodes
 *   npm run migrate:joincodes -- --dry-run
 */

interface Summary {
  scanned: number;
  backfilled: number;
  alreadyCurrent: number;
  conflicts: { id: string; name: string; code: string }[];
}

/**
 * Drops the unique index on the old `joinCode` field.
 *
 * Mongo never removes an index because a schema stopped declaring it, so the old
 * one keeps enforcing uniqueness on the display form. That is not merely dead
 * weight: it would reject `SURAJ-KAMAL` for one community while a second holds
 * `SURAJKAMAL`, even though the new model considers those the same code and the
 * new index would too.
 */
async function dropStaleIndex(): Promise<boolean> {
  const collection = CommunityModel.collection;
  const indexes = await collection.indexes();
  const stale = indexes.find((index) => index.name === 'joinCode_1');

  if (!stale) return false;

  await collection.dropIndex('joinCode_1');
  return true;
}

async function migrate(dryRun: boolean): Promise<Summary> {
  const summary: Summary = { scanned: 0, backfilled: 0, alreadyCurrent: 0, conflicts: [] };

  // Read through the raw collection rather than the model: the documents being
  // repaired are exactly the ones that fail the model's `required` validation.
  const cursor = CommunityModel.collection.find<{
    _id: Types.ObjectId;
    name?: string;
    joinCode?: string;
    joinCodeNormalised?: string;
    status?: string;
  }>({});

  /** Guards against two legacy codes normalising to the same key. */
  const claimed = new Map<string, string>();

  for await (const doc of cursor) {
    summary.scanned += 1;

    const rawCode = doc.joinCode;
    if (!rawCode) {
      logger.warn({ id: doc._id.toString() }, 'Community has no join code; skipped');
      continue;
    }

    if (doc.joinCodeNormalised) {
      summary.alreadyCurrent += 1;
      claimed.set(doc.joinCodeNormalised, doc._id.toString());
      continue;
    }

    const display = toDisplayCode(rawCode);
    const normalised = normaliseJoinCode(rawCode);

    // Two old codes can collapse to one key under the new rules. Report rather
    // than silently pick a winner — which community keeps the code is a business
    // decision, and the unique index would reject the loser anyway.
    const existingOwner = claimed.get(normalised);
    if (existingOwner !== undefined) {
      summary.conflicts.push({
        id: doc._id.toString(),
        name: doc.name ?? '(unnamed)',
        code: display,
      });
      continue;
    }
    claimed.set(normalised, doc._id.toString());

    // A legacy code is "custom" unless it happens to be a valid word pair — the
    // flag only drives whether the UI offers a Devanagari rendering, and claiming
    // a rendering we cannot produce would show an empty line on a poster.
    const isCustom = toDevanagariCode(display) === null;

    if (!dryRun) {
      await CommunityModel.collection.updateOne(
        { _id: doc._id },
        {
          $set: {
            joinCode: display,
            joinCodeNormalised: normalised,
            joinCodeIsCustom: isCustom,
            joinCodeUpdatedAt: new Date(),
          },
        },
      );
    }

    summary.backfilled += 1;
    logger.info(
      { id: doc._id.toString(), name: doc.name, code: display, normalised },
      dryRun ? 'Would backfill' : 'Backfilled',
    );
  }

  return summary;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  await connectMongo();

  if (dryRun) {
    logger.info('Dry run — nothing will be written');
  } else {
    const dropped = await dropStaleIndex();
    if (dropped) logger.info('Dropped the stale joinCode_1 index');
  }

  const summary = await migrate(dryRun);

  logger.info(
    {
      scanned: summary.scanned,
      backfilled: summary.backfilled,
      alreadyCurrent: summary.alreadyCurrent,
      conflicts: summary.conflicts.length,
    },
    'Join-code migration finished',
  );

  if (summary.conflicts.length > 0) {
    logger.error(
      { conflicts: summary.conflicts },
      'These communities share a normalised code with another and were NOT migrated. ' +
        'Give each a new code from the admin console, then run this again.',
    );
  }
}

try {
  await main();
  await disconnectMongo();
  process.exit(0);
} catch (error) {
  logger.fatal({ err: error }, 'Join-code migration failed');
  await disconnectMongo().catch(() => undefined);
  process.exit(1);
}
