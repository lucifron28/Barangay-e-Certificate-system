FROM node:22-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    npm_config_cache=/home/node/.npm \
    PATH=/home/node/.local/bin:$PATH

# Tooling is installed in the image as root; the interactive runtime switches to node below.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        build-essential \
        ca-certificates \
        curl \
        git \
        jq \
        openssh-client \
        pkg-config \
        python3 \
        sqlite3 \
    && mkdir -p -m 755 /etc/apt/keyrings \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
        | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg >/dev/null \
    && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && printf '%s\n' \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
        > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends gh \
    && rm -rf /var/lib/apt/lists/*

# The official installer publishes the current stable Turso CLI for Linux.
RUN curl --proto '=https' --tlsv1.2 -fsSL https://get.tur.so/install.sh \
        -o /tmp/install-turso.sh \
    && bash /tmp/install-turso.sh \
    && TURSO_BIN="$(command -v turso || true)" \
    && if [ -z "$TURSO_BIN" ]; then \
         TURSO_BIN="$(find /root /usr/local/bin -type f -name turso -perm /111 -print -quit 2>/dev/null || true)"; \
       fi \
    && test -n "$TURSO_BIN" \
    && if [ "$TURSO_BIN" != "/usr/local/bin/turso" ]; then \
         install -m 0755 "$TURSO_BIN" /usr/local/bin/turso; \
       fi \
    && rm -f /tmp/install-turso.sh

RUN npm install --global vercel@latest \
    && mkdir -p /home/node/.npm \
    && chown -R node:node /home/node

WORKDIR /workspace

RUN node --version \
    && npm --version \
    && git --version \
    && gh --version \
    && sqlite3 --version \
    && turso --version \
    && vercel --version

USER node

CMD ["bash"]
