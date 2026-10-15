FROM node:20-slim AS web
WORKDIR /web
COPY web/package*.json ./
RUN npm install
COPY web .
RUN npm run build

FROM node:20-slim
ARG TARGETARCH
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* \
 && curl -fL "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux$([ "$TARGETARCH" = arm64 ] && echo _aarch64)" \
    -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp
WORKDIR /app
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server .
RUN npx prisma generate
COPY --from=web /web/dist ./public
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --skip-generate && node server.js"]
