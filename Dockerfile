# --- Stage 1: Build the client assets ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy and install client dependencies
COPY client/package*.json ./client/
RUN cd client && npm install

# Copy client source and build it
COPY client/ ./client/
RUN cd client && npm run build


# --- Stage 2: Build the final production image ---
FROM node:20-alpine

WORKDIR /app

# Copy package.json for the server and install *only* production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy the server source code
COPY . .

# Copy the built client assets from the 'builder' stage
COPY --from=builder /app/client/build ./client/build

# Expose the correct port
EXPOSE 5000

# Set production environment
ENV NODE_ENV=production

# Start the server using the production command
CMD ["npm", "start"]