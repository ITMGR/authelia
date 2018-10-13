FROM node:10-alpine

WORKDIR /usr/src

COPY package.json /usr/src/package.json

RUN apk --update add --no-cache --virtual \
      .build-deps make g++ python && \
    npm install --production && \
    apk del .build-deps

COPY dist/server /usr/src/server
COPY dist/shared /usr/src/shared

EXPOSE 8080

VOLUME /etc/authelia
VOLUME /var/lib/authelia

CMD ["node", "server/src/index.js", "/etc/authelia/config.yml"]
