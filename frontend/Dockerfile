FROM node:21-alpine as build-stage

RUN apk add --no-cache git

WORKDIR /app


RUN --mount=type=bind,source=../,target=/parent-folder \
    export GIT_HASH=$(git -C /parent-folder rev-parse --short HEAD) && \
    echo "VUE_APP_GIT_HASH=$GIT_HASH" > .env

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# production stage
FROM nginx:stable-alpine as production-stage
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY --from=build-stage /app/.env /
COPY ./nginx/config /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]