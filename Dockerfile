FROM node:20-slim

# Install git and bash
RUN apt-get update && apt-get install -y \
    git \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /home/container

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy bot source code
COPY src/ ./src/
COPY deploy.sh ./
COPY .env.example ./

# Make deploy script executable
RUN chmod +x deploy.sh

# Default command
CMD ["bash", "deploy.sh"]
