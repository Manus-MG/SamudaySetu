import mongoose from 'mongoose';
import { env, isProduction } from '../../config/index.js';
import { logger } from '../logger/index.js';

/** Human-readable projection of `mongoose.connection.readyState`. */
export type MongoStatus = 'disconnected' | 'connected' | 'connecting' | 'disconnecting';

const READY_STATE: Readonly<Record<number, MongoStatus>> = Object.freeze({
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
});

mongoose.set('strictQuery', true);

let listenersBound = false;

function bindConnectionListeners(): void {
  if (listenersBound) return;
  listenersBound = true;
  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
  mongoose.connection.on('error', (err: Error) => logger.error({ err }, 'MongoDB error'));
}

export async function connectMongo(): Promise<typeof mongoose> {
  bindConnectionListeners();

  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB_NAME,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    maxPoolSize: 20,
    minPoolSize: 2,
    // In production indexes are applied by an explicit migration, never on boot.
    autoIndex: !isProduction,
  });

  return mongoose;
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.connection.close();
}

export const getMongoStatus = (): MongoStatus =>
  READY_STATE[mongoose.connection.readyState] ?? 'disconnected';

export const isMongoHealthy = (): boolean =>
  mongoose.connection.readyState === mongoose.ConnectionStates.connected;
