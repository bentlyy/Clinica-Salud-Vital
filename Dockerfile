FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ src/
RUN npm run build:backend

FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist/ dist/
COPY frontend/dist/ frontend/dist/

USER appuser

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/app.js"]
