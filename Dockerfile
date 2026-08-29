# Browser-based firmware lab: code-server (VS Code in the browser) + OpenOCD + arm-none-eabi
# toolchain, so ST-Link-based firmware work can happen entirely through the browser -- program,
# debug, and (via the bundled codereview extension's tutor mode) learn embedded development.
#
# code-server chosen over linuxserver/docker-vscode after a comparative review: code-server is a
# thin, MIT-licensed, single-process wrapper around real VS Code Server -- linuxserver's image
# streams a full GUI desktop via Selkies (GPL-3.0, heavier, grants passwordless root to the GUI
# user), which is unnecessary weight and a bigger attack surface for a browser-IDE-only use case.
FROM codercom/code-server:latest

USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
        openocd \
        gcc-arm-none-eabi \
        binutils-arm-none-eabi \
        gdb-multiarch \
        make \
        udev \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Extensions must be installed as `coder` (the runtime user) -- code-server resolves its
# extensions dir from $HOME, and the container runs as `coder`, not root. Installing as root
# during the build puts them under /root, invisible to the server actually started at runtime.
USER coder

# cortex-debug (Open VSX, MIT) for GDB/OpenOCD-driven debugging inside code-server.
RUN code-server --install-extension marus25.cortex-debug

COPY --chown=coder:coder example-firmware /home/coder/workspace
COPY --chown=coder:coder vscode-extension/codereview-tutor.vsix /tmp/codereview-tutor.vsix
RUN code-server --install-extension /tmp/codereview-tutor.vsix && rm /tmp/codereview-tutor.vsix

WORKDIR /home/coder/workspace

# Bound to loopback only by the compose file's port mapping -- this origin is reached through a
# ct-agent browser-plane tunnel like every other bunsenbrenner.org service, never a public host port.
EXPOSE 8080
