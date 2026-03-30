# Use the official Node.js lightweight image
FROM node:20-alpine
# Set the working directory inside the container
WORKDIR /app

# Copy the package files and install the dependencies (Leaflet, Recharts, etc.)
COPY package*.json ./
RUN npm install

# Copy all your React code into the container
COPY . .

# Expose the port Vite uses
EXPOSE 5173

# CRITICAL: We must add --host so Vite allows external connections outside the Docker container!
CMD ["npm", "run", "dev", "--", "--host"]