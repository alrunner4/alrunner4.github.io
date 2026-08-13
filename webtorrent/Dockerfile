FROM ubuntu:resolute
RUN apt-get update && apt-get install -y nodejs npm
COPY package.json /tmp/package.json
RUN npm install -g only-allow
RUN cd /tmp && npm install --production && npm install -g /tmp/node_modules/webtorrent-cli
ENTRYPOINT ["webtorrent"]
