FROM node:7

LABEL name "lac-addr-service"

ADD package.json /tmp/package.json
RUN cd /tmp && npm install
RUN mkdir -p /app && cp -a /tmp/node_modules /app/

WORKDIR /app
ADD . /app

EXPOSE 443

Run our app.
CMD ["npm", "start"]