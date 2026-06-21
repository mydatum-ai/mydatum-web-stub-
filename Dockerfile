FROM node:20.19-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_MYDATUM_ISSUER
ARG VITE_MYDATUM_CLIENT_ID
ARG VITE_MYDATUM_REDIRECT_URI
ARG VITE_MYDATUM_SCOPES
RUN test -n "$VITE_MYDATUM_CLIENT_ID" \
    && ! echo "$VITE_MYDATUM_CLIENT_ID" | grep -q '^replace-with-' \
    && npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
