FROM node:20 AS builder
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
COPY ../packages ./packages
ARG VITE_APP_API_BASE_URL
ARG VITE_APP_API_SOCKET_URL
ARG VITE_APP_STORE_DOMAIN
ARG VITE_APP_ADMIN_DOMAIN
ARG VITE_APP_ENCRYPT_PASSWORD
ENV VITE_APP_API_BASE_URL=$VITE_APP_API_BASE_URL
ENV VITE_APP_API_SOCKET_URL=$VITE_APP_API_SOCKET_URL
ENV VITE_APP_STORE_DOMAIN=$VITE_APP_STORE_DOMAIN
ENV VITE_APP_ADMIN_DOMAIN=$VITE_APP_ADMIN_DOMAIN
ENV VITE_APP_ENCRYPT_PASSWORD=$VITE_APP_ENCRYPT_PASSWORD
RUN npm run build

FROM node:20 AS runner
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 5100
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy custom Nginx config to enable SPA routing (rewrite to index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
