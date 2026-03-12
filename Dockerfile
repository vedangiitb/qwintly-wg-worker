FROM node:20-slim

WORKDIR /app

# install all dependencies (including dev)
COPY package*.json ./
RUN npm ci

# copy source
COPY . .

# build TypeScript
RUN npm run build

# remove dev dependencies
RUN npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/index.js"]