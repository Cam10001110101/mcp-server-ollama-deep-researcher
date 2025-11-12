FROM node:20-slim AS node-builder

# Set working directory
WORKDIR /app

# Copy package files and install Node.js dependencies
COPY package*.json ./
RUN npm ci

# Copy TypeScript source and config
COPY tsconfig.json ./
COPY src/index.ts ./src/
RUN npm run build

# Use Python image for the final stage
FROM python:3.14.0rc1-slim

# Set working directory
WORKDIR /app

# Install Node.js
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy built Node.js files from the builder stage
COPY --from=node-builder /app/build ./build
COPY --from=node-builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy Python source files
COPY src/assistant ./src/assistant
COPY pyproject.toml ./

# Install Python dependencies
RUN pip install --no-cache-dir -e .

# Set environment variables
ENV NODE_ENV=production
ENV PYTHONPATH=/app

# The MCP server will run on stdio, so no port needs to be exposed
# However, we need to ensure the server can connect to Ollama
ENV OLLAMA_BASE_URL=http://host.docker.internal:11434

# Run the MCP server
CMD ["node", "build/index.js"]
