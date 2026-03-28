FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY server/ ./server/
COPY sql/ ./sql/
COPY knowledge-base/ ./knowledge-base/
COPY server/data/ ./server/data/

EXPOSE 5002

CMD ["npx", "tsx", "server/index.ts"]
