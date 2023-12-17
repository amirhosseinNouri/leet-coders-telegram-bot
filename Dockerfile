# Common build stage
FROM node:alpine as base
From base as deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package*.json tsconfig.json ./
RUN npm ci

FROM base as runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

CMD ["npm", "start"]