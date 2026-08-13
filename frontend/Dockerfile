FROM node:22-alpine AS build
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm install --global pnpm@10.15.0 --registry=$NPM_REGISTRY
COPY package.json pnpm-lock.yaml ./
RUN pnpm config set registry $NPM_REGISTRY && pnpm install --frozen-lockfile
COPY . .
ENV NODE_ENV=production
RUN pnpm build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3001
WORKDIR /app
COPY --from=build --chown=node:node /app/.output ./.output
USER node
EXPOSE 3001
CMD ["node", ".output/server/index.mjs"]
