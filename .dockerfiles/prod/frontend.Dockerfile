# Stage 1: Build the React app with Vite
FROM node:20-slim AS builder

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY frontend/ .

# Build the React application
RUN npm run build

# Stage 2: Serve the built files with Nginx
FROM nginx:alpine

FROM nginx:alpine

# REMOVA a configuração padrão do Nginx para evitar conflitos
RUN rm -rf /etc/nginx/conf.d/*

# Copy the built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx configuration file
COPY frontend/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]