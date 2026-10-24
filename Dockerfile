# Griddy production image: one Node process serves the web app, the API and the live socket.
#   docker build -t griddy .
#   docker run -p 3001:3001 -v griddy-data:/data griddy

# ---- build: install everything, build the web client, drop dev dependencies
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- runtime
FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=3001 \
    DATA_PATH=/data/db.json \
    AVATAR_DIR=/data/avatars
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist
# Accounts, progression and uploaded pictures live in /data; mount a volume there.
RUN mkdir -p /data && chown node:node /data
VOLUME /data
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3001/api/health > /dev/null || exit 1
CMD ["node", "server/src/index.js"]
