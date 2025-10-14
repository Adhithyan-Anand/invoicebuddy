# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (including dev for build)
RUN npm install

# Copy the rest of the project files
COPY . .

# Build client (if using Vite/React)
RUN if [ -f client/package.json ]; then cd client && npm install && npm run build && cd ..; fi

# Expose the port your server runs on (default: 5000)
EXPOSE 5000

# Set environment variables (override in docker-compose or at runtime)
ENV NODE_ENV=production

# Start the server
CMD ["npm", "run", "dev"]
