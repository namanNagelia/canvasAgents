# Stage 1: Build the Vite app
FROM node:18 AS builder


WORKDIR /app

COPY package*.json ./


RUN npm install

COPY . .

ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=${VITE_API_URL}


RUN VITE_API_URL=${VITE_API_URL} npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]