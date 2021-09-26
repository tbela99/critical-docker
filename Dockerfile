FROM node:alpine
# Installs latest Chromium (89) package.
RUN apk add --no-cache udev \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont
# Install Puppeteer under /node_modules so it's available system-wide
#
WORKDIR /home/puppetmaster
COPY ./dist ./dist
COPY ./package.json .
COPY ./bin/ ./bin/
COPY ./start.sh .
COPY ./src ./src
#
RUN rm -rf src/lib && \
adduser -D -H -h /home/puppetmaster -s /bin/false puppetmaster && \
chown -R puppetmaster:puppetmaster /home/puppetmaster
#
ENV TERM=xterm-256color \
# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
CHROMIUM_PATH="/usr/bin/chromium-browser" \
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
#
USER puppetmaster
# npm install
RUN npm i && \
#    npm audit fix --force &&  \
    cd src && npm i # && npm audit fix --force
#
ENTRYPOINT ["sh", "/home/puppetmaster/start.sh"]
# ENTRYPOINT ["node", "index.js"]
