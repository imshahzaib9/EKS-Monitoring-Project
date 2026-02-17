FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001

WORKDIR /app

# Copy only package files first (for Docker cache)
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy source code
COPY src/ ./src/

# Change ownership to non-root user
RUN chown -R nodeuser:nodejs /app

USER nodeuser

EXPOSE 3000

CMD ["node", "src/app.js"]
