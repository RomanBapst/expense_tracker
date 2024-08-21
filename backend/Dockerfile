FROM node:21-alpine


RUN mkdir -p /home/node/app/node_modules && mkdir -p /home/node/app/uploads && chown -R node:node /home/node/app && chown -R node:node /home/node/app/uploads

WORKDIR /home/node/app

COPY --chown=node:node package*.json ./

RUN apk update && \
    apk add postgresql-client
USER node


RUN npm install
COPY --chown=node:node . .


CMD ["npm", "run", "dev"]

COPY --chown=node:node ./docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
