FROM node:21-alpine as build-stage

RUN apk add --no-cache git

WORKDIR /app

COPY ./package*.json ./
RUN npm install
COPY . .

EXPOSE 80

ENTRYPOINT [ "npm", "run", "dev" ]
