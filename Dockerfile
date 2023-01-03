FROM node:16-alpine

WORKDIR /app
COPY . /app

RUN npm install \
    && npm run build

CMD ["npm", "run", "start:prod"]
