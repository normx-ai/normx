/**
 * Type declarations for plain JS modules in the server
 */

declare module '*/db' {
  import { Pool } from 'pg';
  const pool: Pool;
  export = pool;
}

declare module '*/logger' {
  interface Logger {
    info(message: string, ...args: string[]): void;
    error(message: string, ...args: string[]): void;
    warn(message: string, ...args: string[]): void;
    debug(message: string, ...args: string[]): void;
  }
  const logger: Logger;
  export = logger;
}

declare module '*/qdrant' {
  import { QdrantClient } from '@qdrant/js-client-rest';
  export const qdrant: QdrantClient;
  export function embed(text: string): Promise<number[]>;
  export function embedBatch(texts: string[], batchSize?: number): Promise<number[][]>;
  export function ensureCollection(name: string): Promise<void>;
  export function search(collectionName: string, query: string, limit?: number, filter?: Record<string, { key: string; match: { value: string } }[]> | null): Promise<{ payload: Record<string, string | string[] | number>; score: number }[]>;
  export function upsertPoints(collectionName: string, points: { id: number; vector: number[]; payload: Record<string, string | string[]> }[]): Promise<void>;
  export function healthCheck(): Promise<{ ok: boolean; info?: Record<string, string>; error?: string }>;
  export const VECTOR_SIZE: number;
}
