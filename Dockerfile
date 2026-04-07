# ── Build frontend ──
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY public/ public/
COPY src/ src/
COPY tsconfig.json ./
ENV REACT_APP_API_URL=/api
RUN npm run build

# ── Backend ──
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server/ server/
COPY --from=frontend /app/build public

USER node
EXPOSE 5002
CMD ["node", "server/index.js"]
