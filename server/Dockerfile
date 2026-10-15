FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    NODE_ENV=production

# Google Chrome (real browser for the Qatar Airways search) + virtual display.
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini wget ca-certificates gnupg xvfb xauth fonts-liberation fonts-noto-core \
 && wget -q -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
 && apt-get install -y --no-install-recommends /tmp/chrome.deb \
 && rm -f /tmp/chrome.deb \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund
COPY . .

# tini is PID 1: it reaps zombie Chrome processes so the container never hits its process limit.
ENTRYPOINT ["/usr/bin/tini", "-s", "-g", "--"]
CMD ["sh", "-c", "xvfb-run -a --server-args='-screen 0 1366x900x24' node index.js"]
