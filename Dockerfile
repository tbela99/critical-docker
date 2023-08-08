FROM alpine:3.18.3
# Installs latest Chromium package.
RUN apk add --no-cache  udev  nodejs npm \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont
#
WORKDIR /home/puppetmaster
COPY ./dist ./dist
COPY ./package.json ./package.json
COPY ./bin/ ./bin/
COPY ./start.sh ./start.sh
COPY ./src ./src
#
RUN rm -rf src/lib && \
adduser -D -H -h /home/puppetmaster -s /bin/false puppetmaster && \
mkdir -p /home/puppetmaster/.cache/ms-playwright/chromium-956323/chrome-linux/ && \
ln -s /usr/bin/chromium-browser /home/puppetmaster/.cache/ms-playwright/chromium-956323/chrome-linux/chrome && \
chown -R puppetmaster:puppetmaster /home/puppetmaster
#
ENV TERM=xterm-256color \
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
#
USER puppetmaster
# npm install
RUN npm i --only=prod --no-optional && \
#    npm audit fix --force &&  \
cd src && npm i --only=prod --no-optional
ENTRYPOINT ["sh", "/home/puppetmaster/start.sh"]