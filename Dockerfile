# --- Stage 1: The Builder ---
# This stage installs dependencies and builds the application.
FROM node:20-alpine AS builder

# Set an environment variable to ensure Puppeteer doesn't download Chrome
ENV PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app

# Copy the package files and install ALL dependencies (including devDependencies for building)
COPY package*.json ./
RUN npm install --cache .npm-cache

# Copy the rest of the source code
COPY . .

# Run the build script to compile the frontend and backend into the /dist folder
RUN npm run build


# --- Stage 2: The Final Production Image ---
# This stage creates the small, final image to be deployed.
FROM node:20-alpine

WORKDIR /app

# Copy the package files again
COPY package*.json ./

# Install ONLY production dependencies to keep the image small
RUN npm install --omit=dev

# Copy the built application from the 'builder' stage
COPY --from=builder /app/dist ./dist

# Expose the port your server runs on
EXPOSE 5000

# The command to start your server in production
CMD ["node", "dist/index.js"]