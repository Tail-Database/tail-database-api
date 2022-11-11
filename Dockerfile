FROM node:18-alpine

WORKDIR /app
COPY . /app

RUN npm install \
    && npm run build \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

CMD ["npm", "run", "start:prod"]
