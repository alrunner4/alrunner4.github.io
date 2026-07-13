FROM ubuntu:resolute
RUN ["apt-get", "update" ]
RUN ["apt-get", "install", "-y", "nodejs", "npm"]
RUN ["npm", "install", "-g", "only-allow"]
RUN ["npm", "install", "-g", "webtorrent-cli"]
ENTRYPOINT ["webtorrent"]
