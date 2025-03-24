FROM node:20 AS builder

WORKDIR /app

COPY . .

WORKDIR /app/client
RUN npm install && npm run build

FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

COPY --from=builder /app/client/build ./client/build

EXPOSE 3000

CMD ["npm", "start"]
