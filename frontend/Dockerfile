FROM node:20-slim

WORKDIR /app

# Copy package manifests
COPY package*.json ./

RUN npm install

# Copy application files
COPY . ./

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "run", "dev"]
