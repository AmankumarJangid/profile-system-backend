FROM node:24-bookworm-slim

WORKDIR /app

COPY package*.json .

RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 5000

CMD [ "npm", "start"]