# syntax=docker/dockerfile:1.7
# CaDS Firmware Lab image (SPEC.md §4): code-server + ARM GNU toolchain + the
# cads-zero workspace seed, pre-built once at image build time as a smoke test.
#
# No OpenOCD, no USB passthrough: the board sits at the student's computer and is
# driven from the browser (cads-probe, WebUSB). st-flash / st-info inside the
# container are HTTP shims against cads-board-bridge (127.0.0.1:3335).
#
# Build (the cads-zero repo is private, the token is a BuildKit secret and never
# lands in a layer):
#   GH_TOKEN=$(gh auth token) docker build --secret id=gh_token,env=GH_TOKEN -t cads-firmware-lab .
# or simply scripts/run-local.sh.

############################################################################
# base: OS packages + ARM GNU toolchain (shared by the seed build stage and
# the final image, so both see exactly the same compilers).
############################################################################
FROM codercom/code-server:latest AS base

ARG TARGETARCH
ARG ARM_GNU_VERSION=13.3.rel1
# From https://developer.arm.com/-/media/Files/downloads/gnu/13.3.rel1/binrel/*.sha256asc
ARG ARM_GNU_SHA256_AMD64=95c011cee430e64dd6087c75c800f04b9c49832cc1000127a92a97f9c8d83af4
ARG ARM_GNU_SHA256_ARM64=c8824bffd057afce2259f7618254e840715f33523a3d4e4294f471208f976764

USER root
ENV DEBIAN_FRONTEND=noninteractive

# build-essential/pkg-config: the `host` preset (SDL2 simulator + unit tests)
# compiles with the native compiler. clangd: the vscode-clangd extension needs a
# real clangd binary and must not depend on downloading one at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        pkg-config \
        cmake \
        ninja-build \
        python3 \
        python3-serial \
        socat \
        git \
        clang-format \
        clangd \
        libsdl2-dev \
        gdb-multiarch \
        binutils \
        xz-utils \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ARM GNU Toolchain 13.3.rel1 (the exact version cads-zero is developed with),
# official tarball per architecture, SHA-256 verified. Docs/man pages dropped
# (~100 MB nobody reads inside a container).
RUN set -eu; \
    case "${TARGETARCH}" in \
        amd64) host=x86_64;  sha="${ARM_GNU_SHA256_AMD64}" ;; \
        arm64) host=aarch64; sha="${ARM_GNU_SHA256_ARM64}" ;; \
        *) echo "unsupported TARGETARCH=${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    tarball="arm-gnu-toolchain-${ARM_GNU_VERSION}-${host}-arm-none-eabi.tar.xz"; \
    url="https://developer.arm.com/-/media/Files/downloads/gnu/${ARM_GNU_VERSION}/binrel/${tarball}"; \
    echo "downloading ${url}"; \
    curl -fSL --retry 5 --retry-delay 5 -o "/tmp/${tarball}" "${url}"; \
    echo "${sha}  /tmp/${tarball}" | sha256sum -c -; \
    mkdir -p /opt/arm-gnu-toolchain; \
    tar -xJf "/tmp/${tarball}" -C /opt/arm-gnu-toolchain --strip-components=1; \
    rm -f "/tmp/${tarball}"; \
    rm -rf /opt/arm-gnu-toolchain/share/doc /opt/arm-gnu-toolchain/share/man /opt/arm-gnu-toolchain/share/info; \
    /opt/arm-gnu-toolchain/bin/arm-none-eabi-gcc --version | head -1

# The toolchain ships ~610 MB of multilibs (Cortex-A/R, v8-M, ...); the lab
# targets one chip (Cortex-M4F = thumb/v7e-m+fp/hard). Keep that plus the
# small-M variants and the defaults, drop the rest: -420 MB in the image.
# CADS_PRUNE_MULTILIBS=0 keeps the full tarball content.
ARG CADS_PRUNE_MULTILIBS=1
RUN set -eu; [ "${CADS_PRUNE_MULTILIBS}" = "1" ] || exit 0; \
    tc=/opt/arm-gnu-toolchain; gccdir="$tc/lib/gcc/arm-none-eabi/$($tc/bin/arm-none-eabi-gcc -dumpversion)"; \
    keep=" . thumb/nofp thumb/v6-m/nofp thumb/v7-m/nofp thumb/v7e-m/nofp thumb/v7e-m+fp/softfp thumb/v7e-m+fp/hard "; \
    for dir in $($tc/bin/arm-none-eabi-gcc -print-multi-lib | cut -d';' -f1); do \
        case "$keep" in *" $dir "*) continue ;; esac; \
        rm -rf "$tc/arm-none-eabi/lib/$dir" "$gccdir/$dir"; \
    done; \
    test -f "$tc/arm-none-eabi/lib/thumb/v7e-m+fp/hard/libc_nano.a"; \
    test -f "$gccdir/thumb/v7e-m+fp/hard/libgcc.a"; \
    echo "multilibs kept:"; $tc/bin/arm-none-eabi-gcc -print-multi-lib | cut -d';' -f1 | while read -r d; do if [ -d "$tc/arm-none-eabi/lib/$d" ]; then echo "  $d"; fi; done; \
    du -sh "$tc"

ENV CADS_ARM_TOOLCHAIN_BIN=/opt/arm-gnu-toolchain/bin
# /usr/local/bin first: that is where the st-flash/st-info shims live and they
# must shadow anything else. Login shells re-source /etc/profile (which resets
# PATH on Debian), hence the profile.d snippet as well.
ENV PATH=/usr/local/bin:/opt/arm-gnu-toolchain/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin
RUN printf '%s\n' \
        'export CADS_ARM_TOOLCHAIN_BIN=/opt/arm-gnu-toolchain/bin' \
        'case ":$PATH:" in *":/opt/arm-gnu-toolchain/bin:"*) ;; *) export PATH="/usr/local/bin:/opt/arm-gnu-toolchain/bin:$PATH" ;; esac' \
        > /etc/profile.d/cads-toolchain.sh

# The toolchain's arm-none-eabi-gdb is linked against libncurses.so.5 (and, on
# x86_64, libpython3.8), neither of which exists on Debian 13 - verified: it
# does not start. gdb-multiarch (Debian 16.x, arm targets built in) is the
# spec'd fallback. /usr/local/bin/arm-none-eabi-gdb keeps cads-zero's docs and
# scripts working by name: it execs the toolchain gdb if that ever starts here,
# else gdb-multiarch. Decided once, at build time, not per invocation.
RUN set -eu; \
    if /opt/arm-gnu-toolchain/bin/arm-none-eabi-gdb --batch -ex 'show version' >/dev/null 2>&1; then \
        target=/opt/arm-gnu-toolchain/bin/arm-none-eabi-gdb; \
    else \
        target=/usr/bin/gdb-multiarch; \
    fi; \
    printf '#!/bin/sh\n# CaDS lab: arm-none-eabi-gdb -> %s (see Dockerfile)\nexec %s "$@"\n' "$target" "$target" \
        > /usr/local/bin/arm-none-eabi-gdb; \
    chmod 0755 /usr/local/bin/arm-none-eabi-gdb; \
    echo "arm-none-eabi-gdb -> $target"; \
    arm-none-eabi-gdb --batch -ex 'show version' | head -1

############################################################################
# seed: clone cads-zero (pinned commit, shallow, with submodules) and build it
# once. Done at the *runtime* path so CMakeCache/compile_commands carry the
# right absolute paths after the seed is copied into the student workspace.
############################################################################
FROM base AS seed

ARG CADS_ZERO_REPO=https://github.com/scimbe/cads-zero.git
ARG CADS_ZERO_REF=e882fabd347c0b5ca04a7668b50be1d005924cb9
# 1 = skip the host (SDL2/ctest) smoke test at image build time.
ARG CADS_SKIP_HOST_BUILD=0
# 1 = keep build/host in the seed (faster first "Host tests" run, bigger image).
ARG CADS_KEEP_HOST_BUILD=0

USER coder
WORKDIR /home/coder/workspace

# The token (if any) is read by a git credential helper straight from the
# secret file - it never appears in argv, in a config file or in a layer.
RUN --mount=type=secret,id=gh_token,uid=1000,required=false \
    set -eu; \
    if [ -s /run/secrets/gh_token ]; then \
        export GIT_CONFIG_COUNT=1 \
               GIT_CONFIG_KEY_0=credential.helper \
               GIT_CONFIG_VALUE_0='!f() { echo username=x-access-token; echo "password=$(cat /run/secrets/gh_token)"; }; f'; \
    else \
        echo "note: no gh_token build secret - cloning ${CADS_ZERO_REPO} anonymously" >&2; \
    fi; \
    git init -q cads-zero; \
    cd cads-zero; \
    git remote add origin "${CADS_ZERO_REPO}"; \
    git fetch --depth 1 origin "${CADS_ZERO_REF}"; \
    git checkout -q -b cads-lab FETCH_HEAD; \
    git submodule update --init --recursive --depth 1 --jobs 2; \
    # modules/net/CMakeLists.txt patches lib/lwip at configure time (by design);
    # don't show that as " m lib/lwip" in every student's git status.
    git config submodule.lib/lwip.ignore dirty; \
    git log --oneline -1; \
    git submodule status; \
    du -sh . .git

# Firmware build = the image's own smoke test. Must produce cads-zero.bin.
RUN set -eu; cd /home/coder/workspace/cads-zero; \
    cmake --preset itsboard; \
    cmake --build build/itsboard; \
    ls -l build/itsboard/cads-zero.elf build/itsboard/cads-zero.bin build/itsboard/cads-zero.hex; \
    test -s build/itsboard/compile_commands.json; \
    python3 scripts/check_ram_budget.py build/itsboard/cads-zero.elf

# Host simulator + unit tests (SDL2, headless via the dummy video driver).
# The two golden-image tests (golden_splash, golden_boot_desktop) compare SDL's
# RGB565->24bpp BMP conversion pixel-exactly against PNGs captured with the
# maintainer's SDL build; Debian's SDL2 2.32 rounds anti-aliased edges +1
# (cads-zero docs/ROADMAP.md, 2026-09-01: "environmental, not a regression").
# They are excluded from the *image smoke test* only; the workspace task
# "CaDS: Host tests" runs the full suite. build/host is dropped afterwards
# unless CADS_KEEP_HOST_BUILD=1.
RUN set -eu; cd /home/coder/workspace/cads-zero; \
    if [ "${CADS_SKIP_HOST_BUILD}" = "1" ]; then echo "host build skipped (CADS_SKIP_HOST_BUILD=1)"; exit 0; fi; \
    export SDL_VIDEODRIVER=dummy SDL_AUDIODRIVER=dummy; \
    cmake --preset host; \
    cmake --build build/host; \
    ctest --test-dir build/host --output-on-failure -E '^golden_'; \
    ctest --test-dir build/host -R '^golden_' || echo "note: golden-image tests differ on this SDL build (expected, see Dockerfile)"; \
    if [ "${CADS_KEEP_HOST_BUILD}" != "1" ]; then rm -rf build/host; fi; \
    du -sh build/* 2>/dev/null || true

############################################################################
# final image
############################################################################
FROM base

USER root

# st-flash / st-info shims (SPEC.md §3.2) - first on PATH.
COPY --chmod=0755 image/shims/st-flash image/shims/st-info /usr/local/bin/
COPY --chmod=0644 image/shims/cads_shim_common.py /usr/local/bin/

# Workspace seed + the container-specific .vscode/.clangd templates the
# entrypoint script writes into the workspace on every start.
COPY --from=seed --chown=coder:coder /home/coder/workspace/cads-zero /opt/cads-seed/cads-zero
COPY --chown=coder:coder image/vscode-templates/ /opt/cads-seed/vscode-templates/
COPY --chmod=0755 image/entrypoint.d/ /entrypoint.d/

RUN mkdir -p /home/coder/workspace && chown coder:coder /home/coder/workspace

# Extensions must be installed as `coder`: code-server resolves its extension
# directory from $HOME and the container runs as coder.
USER coder

# Open VSX (SPEC.md §4). One RUN per group keeps the layers cacheable.
RUN set -eu; for ext in \
        marus25.cortex-debug \
        mcu-debug.peripheral-viewer \
        mcu-debug.debug-tracker-vscode \
        mcu-debug.memory-view \
        mcu-debug.rtos-views \
        ms-vscode.cmake-tools \
        llvm-vs-code-extensions.vscode-clangd \
        ms-python.python \
    ; do code-server --install-extension "$ext"; done

# The three CaDS extensions (cads-probe, cads-board-bridge, cads-tutor) are
# built by their own streams into extensions/*/dist/*.vsix. .dockerignore
# admits only those .vsix files into the build context; an empty directory is
# fine (the image still builds, just without them).
COPY --chown=coder:coder extensions/ /tmp/cads-extensions/
RUN set -eu; n=0; \
    for vsix in /tmp/cads-extensions/*/dist/*.vsix; do \
        [ -e "$vsix" ] || continue; \
        echo "installing $vsix"; code-server --install-extension "$vsix"; n=$((n+1)); \
    done; \
    echo "CaDS extensions installed: $n"; \
    rm -rf /tmp/cads-extensions; \
    code-server --list-extensions --show-versions

# User settings (SPEC.md §4).
COPY --chown=coder:coder image/settings/user-settings.json /home/coder/.local/share/code-server/User/settings.json

ENV CADS_WORKSPACE=/home/coder/workspace/cads-zero \
    SDL_VIDEODRIVER=dummy \
    SDL_AUDIODRIVER=dummy

WORKDIR /home/coder/workspace

# Loopback only on the host side (compose / docker run map 127.0.0.1:808x).
EXPOSE 8080

# Full CMD in the image so a plain `docker run` (the lab deployment uses no
# compose) is correct: without --disable-workspace-trust a fresh profile opens
# in Restricted Mode with every extension disabled.
CMD ["--bind-addr", "0.0.0.0:8080", \
     "--app-name", "CaDS Firmware Lab", \
     "--disable-workspace-trust", \
     "--disable-telemetry", \
     "--disable-update-check", \
     "/home/coder/workspace/cads-zero"]
