FROM node:22-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4173
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -q -O - http://127.0.0.1:4173/api/health || exit 1
USER node
CMD ["node", "ordering/server.mjs"]
