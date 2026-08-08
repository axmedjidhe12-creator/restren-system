FROM node:20-alpine

WORKDIR /app

# Copy backend dependencies and schema
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm install

# Copy backend source code
COPY backend/ .

RUN npx prisma generate
RUN npm run build

EXPOSE 5000

CMD ["node", "dist/server.js"]
