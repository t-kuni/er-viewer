FROM node:18-alpine

# Install git for build info generation
RUN apk add --no-cache git

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate build info
RUN npm run build

EXPOSE 3000

# Use nodemon for development with hot reload
CMD ["npm", "run", "dev"]