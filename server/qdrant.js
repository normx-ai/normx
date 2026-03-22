// ===================== CLIENT QDRANT + EMBEDDINGS =====================
const { QdrantClient } = require('@qdrant/js-client-rest');
const logger = require('./logger');

// -------------------- Qdrant Client --------------------

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
});

// -------------------- Embeddings (multilingual) --------------------

let pipeline = null;

async function getEmbeddingPipeline() {
  if (pipeline) return pipeline;
  const { pipeline: createPipeline } = await import('@xenova/transformers');
  // Modèle multilingue léger — supporte le français
  pipeline = await createPipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');
  logger.info('Modele d\'embeddings charge: paraphrase-multilingual-MiniLM-L12-v2');
  return pipeline;
}

async function embed(text) {
  const extractor = await getEmbeddingPipeline();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

async function embedBatch(texts, batchSize = 32) {
  const extractor = await getEmbeddingPipeline();
  const results = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const outputs = await Promise.all(
      batch.map(t => extractor(t, { pooling: 'mean', normalize: true }))
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

// -------------------- Collections --------------------

const VECTOR_SIZE = 384; // MiniLM-L12-v2 output dimension

async function ensureCollection(name) {
  try {
    const exists = await qdrant.collectionExists(name);
    if (exists.exists) {
      logger.info(`Collection Qdrant "${name}" existe deja`);
      return;
    }
  } catch (_) {
    // collectionExists might not be available in older clients
  }

  try {
    await qdrant.getCollection(name);
    logger.info(`Collection Qdrant "${name}" existe deja`);
    return;
  } catch (_) {
    // collection doesn't exist, create it
  }

  await qdrant.createCollection(name, {
    vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
    optimizers_config: { default_segment_number: 2 },
  });
  logger.info(`Collection Qdrant "${name}" creee (dim=${VECTOR_SIZE})`);
}

// -------------------- Search --------------------

async function search(collectionName, query, limit = 8, filter = null) {
  const queryVector = await embed(query);
  const params = {
    vector: queryVector,
    limit,
    with_payload: true,
  };
  if (filter) params.filter = filter;
  const results = await qdrant.search(collectionName, params);
  return results;
}

// -------------------- Upsert --------------------

async function upsertPoints(collectionName, points) {
  // points = [{ id, vector, payload }]
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

// -------------------- Health --------------------

async function healthCheck() {
  try {
    const info = await qdrant.api('cluster').clusterStatus();
    return { ok: true, info };
  } catch (err) {
    try {
      // Fallback: try a simple collections list
      await qdrant.getCollections();
      return { ok: true };
    } catch (err2) {
      return { ok: false, error: err2.message };
    }
  }
}

module.exports = {
  qdrant,
  embed,
  embedBatch,
  ensureCollection,
  search,
  upsertPoints,
  healthCheck,
  VECTOR_SIZE,
};
