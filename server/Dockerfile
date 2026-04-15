FROM node:20-alpine

# Couche de compatibilite glibc requise par onnxruntime-node (utilise par
# @xenova/transformers dans qdrant.ts pour la generation d'embeddings).
# Alpine est base sur musl, et onnxruntime-node ne ship que des binaires
# compiles contre glibc. gcompat fournit le shim necessaire.
RUN apk add --no-cache gcompat libstdc++

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY server/ ./server/
COPY sql/ ./sql/
COPY knowledge-base/ ./knowledge-base/
COPY server/data/ ./server/data/

RUN mkdir -p /app/server/logs && chown -R node:node /app
USER node
EXPOSE 5002

CMD ["npx", "tsx", "server/index.ts"]
