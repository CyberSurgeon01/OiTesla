FROM node:20-slim
RUN apt-get update && apt-get install -y openssl procps curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]
