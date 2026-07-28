# Render service — Node + Chromium. Puppeteer's bundled Chromium needs a few system
# libraries; the slim base + these packages keeps the image small but functional.
FROM node:20-slim

ENV PUPPETEER_SKIP_DOWNLOAD=false \
    NODE_ENV=production

# Chromium runtime dependencies.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc-s1 \
    libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libx11-6 libxcb1 \
    libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 libxkbcommon0 \
    wget xdg-utils \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Install workspace deps and build core → adapters → render-service.
RUN corepack enable && pnpm install --frozen-lockfile=false \
  && pnpm --filter @docsmith/core build \
  && pnpm --filter @docsmith/adapters build \
  && pnpm --filter @docsmith/render-service build

EXPOSE 8090
CMD ["node", "packages/render-service/dist/server.js"]
