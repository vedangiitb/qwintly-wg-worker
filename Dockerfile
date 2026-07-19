FROM node:20-slim

WORKDIR /app

# install all dependencies (including dev)
COPY package*.json ./
RUN npm ci --ignore-scripts

# copy source
COPY . .

# build TypeScript and remove dev dependencies
RUN npm run build && \
    npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/src/main.js"]
