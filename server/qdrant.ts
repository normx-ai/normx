import { QdrantClient } from "@qdrant/js-client-rest";
import logger from "./logger";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pipeline: any = null;

async function getEmbeddingPipeline() {
  if (pipeline) return pipeline;
  const { pipeline: createPipeline } = await import("@xenova/transformers");
  pipeline = await createPipeline("feature-extraction", "Xenova/paraphrase-multilingual-MiniLM-L12-v2");
  logger.info("Modele d'embeddings charge: paraphrase-multilingual-MiniLM-L12-v2");
  return pipeline;
}

export async function embed(text: string): Promise<number[]> {
  const extractor = await getEmbeddingPipeline();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

export async function embedBatch(texts: string[], batchSize = 32): Promise<number[][]> {
  const extractor = await getEmbeddingPipeline();
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const outputs = await Promise.all(
      batch.map((t: string) => extractor(t, { pooling: "mean", normalize: true }))
    );
    for (const out of outputs) {
      results.push(Array.from(out.data));
    }
    if (i + batchSize < texts.length) {
      logger.info(`Embeddings: ${Math.min(i + batchSize, texts.length)}/${texts.length}`);
    }
  }
  return results;
}

export const VECTOR_SIZE = 384;

export async function ensureCollection(name: string): Promise<void> {
  try {
    const exists = await qdrant.collectionExists(name);
    if (exists.exists) {
      logger.info(`Collection Qdrant "${name}" existe deja`);
      return;
    }
  } catch {
    // collectionExists might not be available
  }

  try {
    await qdrant.getCollection(name);
    logger.info(`Collection Qdrant "${name}" existe deja`);
    return;
  } catch {
    // collection doesn't exist
  }

  await qdrant.createCollection(name, {
    vectors: { size: VECTOR_SIZE, distance: "Cosine" },
    optimizers_config: { default_segment_number: 2 },
  });
  logger.info(`Collection Qdrant "${name}" creee (dim=${VECTOR_SIZE})`);
}

export async function search(
  collectionName: string,
  query: string,
  limit = 8,
  filter: Record<string, unknown> | null = null
) {
  const queryVector = await embed(query);
  const results = await qdrant.search(collectionName, {
    vector: queryVector,
    limit,
    with_payload: true,
    ...(filter ? { filter } : {}),
  });
  return results;
}

export async function upsertPoints(
  collectionName: string,
  points: { id: number | string; vector: number[]; payload: Record<string, unknown> }[]
) {
  const BATCH = 5;
  for (let i = 0; i < points.length; i += BATCH) {
    const batch = points.slice(i, i + BATCH);
    await qdrant.upsert(collectionName, { points: batch, wait: true });
    if ((i + BATCH) % 50 === 0) {
      logger.info(`Upsert: ${Math.min(i + BATCH, points.length)}/${points.length}`);
    }
  }
  logger.info(`Upsert ${points.length} points dans "${collectionName}"`);
}

export async function healthCheck(): Promise<{ ok: boolean; error?: string }> {
  try {
    await qdrant.getCollections();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export { qdrant };
