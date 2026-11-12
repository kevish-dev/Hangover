# Stage 1: Base runtime environment with OpenSSL and curl
FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends openssl curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Stage 2: Dependencies stage (includes devDependencies for Prisma generate and migrations)
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 3: Builder stage to generate Prisma Client
FROM deps AS builder
WORKDIR /app
COPY prisma.config.js ./
COPY src/prisma ./src/prisma
RUN npx prisma generate

# Stage 4: Dedicated migration image for one-shot `migrate` service
FROM base AS migrate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/src/prisma/generated ./src/prisma/generated
COPY package.json package-lock.json prisma.config.js ./
COPY src/prisma ./src/prisma
CMD ["npx", "prisma", "migrate", "deploy"]

# Stage 5: Minimal production runtime image (runner)
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/src/prisma/generated ./src/prisma/generated
COPY prisma.config.js ./
COPY src ./src
COPY index.js ./

USER node

EXPOSE 8080

CMD ["node", "index.js"]
