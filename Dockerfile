FROM node:22-slim

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable \
  && corepack prepare pnpm@11.25.0 --activate \
  && pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN pnpm build

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "PORT=\"${PORT:-3000}\" HOST=\"${HOST:-0.0.0.0}\" node .output/server/index.mjs"]
