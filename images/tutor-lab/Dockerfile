# syntax=docker/dockerfile:1.7
# CaDS Tutor Lab image (SPEC.md Addendum v1.1 A4): code-server + Rust (rustup
# stable, rustfmt, clippy, rust-src) + Node 22 + rust-analyzer / ESLint /
# CodeLLDB + the cads-tutor extension + the rust-foundations and
# javascript-foundations course packs and starter workspaces.
#
# No firmware toolchain, no board bridge, no secrets: everything comes from
# public downloads (SHA-256 pinned where the publisher gives a checksum or the
# artefact is pinned by version).
#
# Build context is the REPOSITORY ROOT (courses/, workspaces/, extensions/):
#   docker build -f images/tutor-lab/Dockerfile -t cads-tutor-lab:dev .
# or scripts/run-local-tutor-lab.sh.

############################################################################
# base: OS packages, Node 22, Rust toolchain (shared by the seed build stage
# and the final image so both compile with exactly the same tools).
############################################################################
FROM codercom/code-server:latest AS base

ARG TARGETARCH
# https://nodejs.org/dist/v22.23.2/SHASUMS256.txt
ARG NODE_VERSION=22.23.2
ARG NODE_SHA256_AMD64=d60acfe00a2932254bb0ad20e01b0d74397a0875595de719654b214f4b03f307
ARG NODE_SHA256_ARM64=fff4078c5def658577f92c88db7db3bc0072924bfb93fe52c1e744a54e94abb8
# rustup toolchain spec; "stable" = latest stable at build time (recorded in
# the build log and docs/TUTOR-LAB-NOTES.md). Pin e.g. 1.91.0 for repeatability.
ARG RUST_TOOLCHAIN=stable

USER root
ENV DEBIAN_FRONTEND=noninteractive

# build-essential + pkg-config + libssl-dev: linker for rustc and the usual
# native build deps of common crates (openssl-sys). python3: course checks and
# scripts/validate-courses.py. Debian's nodejs package is NOT installed - Node
# 22 comes from the official tarball below.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        pkg-config \
        libssl-dev \
        python3 \
        git \
        curl \
        ca-certificates \
        xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Node 22 (official binary tarball, SHA-256 verified) into /usr/local, which
# is on every PATH including login shells. Headers, docs and the top-level
# text files are left out (native addons are not built in the lab).
RUN set -eu; \
    case "${TARGETARCH}" in \
        amd64) arch=x64;   sha="${NODE_SHA256_AMD64}" ;; \
        arm64) arch=arm64; sha="${NODE_SHA256_ARM64}" ;; \
        *) echo "unsupported TARGETARCH=${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    tarball="node-v${NODE_VERSION}-linux-${arch}.tar.xz"; \
    curl -fSL --retry 5 --retry-delay 5 -o "/tmp/${tarball}" "https://nodejs.org/dist/v${NODE_VERSION}/${tarball}"; \
    echo "${sha}  /tmp/${tarball}" | sha256sum -c -; \
    tar -xJf "/tmp/${tarball}" -C /usr/local --strip-components=1 \
        --exclude='*/CHANGELOG.md' --exclude='*/README.md' --exclude='*/LICENSE' \
        --exclude='*/include' --exclude='*/share'; \
    rm -f "/tmp/${tarball}"; \
    node --version; npm --version; \
    # corepack is not enabled (no yarn/pnpm shims that try to download at first use)
    rm -f /usr/local/bin/corepack

# Rust toolchain for the runtime user (rustup keeps everything under $HOME;
# /home/coder/workspace is the only volume, so ~/.rustup and ~/.cargo stay in
# the image). Minimal profile + the three components the lab needs; no
# rust-docs (≈700 MB). rust-src is what rust-analyzer needs for std
# completion/goto; the rust-analyzer *server* is the one bundled in the
# Open VSX extension (platform-specific VSIX, see below).
USER coder
ENV PATH=/home/coder/.cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
RUN set -eu; \
    curl --proto '=https' --tlsv1.2 -fsSL --retry 5 -o /tmp/rustup-init.sh https://sh.rustup.rs; \
    sh /tmp/rustup-init.sh -y --no-modify-path --profile minimal \
        --default-toolchain "${RUST_TOOLCHAIN}" \
        --component rustfmt --component clippy --component rust-src; \
    rm -f /tmp/rustup-init.sh; \
    rm -rf /home/coder/.rustup/toolchains/*/share/doc \
           /home/coder/.rustup/toolchains/*/share/man \
           /home/coder/.rustup/tmp /home/coder/.rustup/downloads; \
    rustc --version; cargo --version; cargo clippy --version; cargo fmt --version; \
    du -sh /home/coder/.rustup /home/coder/.cargo

USER root
# Login shells re-source /etc/profile, which resets PATH on Debian; make sure
# cargo is found there too (docker exec bash -l, tutor `command` checks, ...).
RUN printf '%s\n' \
        'case ":$PATH:" in *":$HOME/.cargo/bin:"*) ;; *) export PATH="$HOME/.cargo/bin:$PATH" ;; esac' \
        > /etc/profile.d/cads-rust.sh

############################################################################
# seed: assemble course packs + starter workspaces from the build context and
# build/test the workspaces once at the RUNTIME path, so cargo's target/
# fingerprints and ~/.cargo/registry are warm when the student starts.
############################################################################
FROM base AS seed

USER root
# The build context is bind-mounted (nothing copied), only what the lab needs
# lands in the layer. Missing course packs / workspaces are tolerated: the
# rust and javascript streams develop them in parallel; until they are merged
# the image carries the clearly marked placeholder workspaces from
# images/tutor-lab/seed-fallback/.
RUN --mount=type=bind,target=/ctx \
    set -eu; \
    mkdir -p /opt/cads-tutor/courses /opt/cads-seed; \
    for c in rust-foundations javascript-foundations; do \
        if [ -f "/ctx/courses/$c/course.json" ]; then \
            cp -a "/ctx/courses/$c" /opt/cads-tutor/courses/; \
            find "/opt/cads-tutor/courses/$c" \( -name '_example*' -o -name node_modules -o -name '*.test.*' \) -prune -exec rm -rf {} +; \
            echo "course pack: $c ($(find /opt/cads-tutor/courses/$c -type f | wc -l) files)"; \
        else \
            echo "note: courses/$c has no course.json in this checkout - not in the image"; \
        fi; \
    done; \
    for w in rust-foundations javascript-foundations; do \
        if [ -d "/ctx/workspaces/$w" ] && [ -n "$(ls -A "/ctx/workspaces/$w")" ]; then \
            cp -a "/ctx/workspaces/$w" "/opt/cads-seed/$w"; \
            # reference solutions and build products never go into the student seed
            rm -rf "/opt/cads-seed/$w/solutions" "/opt/cads-seed/$w/target" "/opt/cads-seed/$w/node_modules"; \
            echo "workspace seed: $w (from workspaces/)"; \
        else \
            cp -a "/ctx/images/tutor-lab/seed-fallback/$w" "/opt/cads-seed/$w"; \
            echo "workspace seed: $w (PLACEHOLDER from images/tutor-lab/seed-fallback - workspaces/$w not merged yet)"; \
        fi; \
    done; \
    chown -R coder:coder /opt/cads-tutor /opt/cads-seed

USER coder
WORKDIR /home/coder/workspace

# Rust. A STARTER workspace must not pass its own tests - the exercises are
# `todo!()` bodies, and a step whose subject is a trait can leave a test target
# that does not even compile until the student writes the code (m1-03 did until
# the rust stream reworked it). So "cargo test is green" is the wrong gate; it
# would mean the exercises were already solved.
#
# The gate is that the LIBRARY and the binaries compile: a starter whose
# src/ does not build is broken for everyone and must fail the image build.
# Everything below that is recorded, never fatal, so the build log shows the
# starter state (how many test targets compile, how many tests pass) and a
# regression is visible in CI without blocking the image.
#
# target/ is NOT shipped: measured on the real workspace, a cold
# `cargo build --tests` is 7 s (the course has no dependencies at all) while
# the build artefacts are 172 MB. Six saved seconds are not worth that; the
# smoke test's 60 s budget is met with room to spare. Revisit if a course ever
# takes a dependency - then the registry cache and target/ start to matter and
# this stage already builds at the runtime path, which is what makes cargo's
# absolute-path fingerprints reusable.
RUN set -eu; \
    # cargo only writes the registry when a course actually takes a dependency;
    # create it so the final stage's COPY has something to copy either way.
    mkdir -p /home/coder/.cargo/registry; \
    mv /opt/cads-seed/rust-foundations /home/coder/workspace/rust-foundations; \
    cd /home/coder/workspace/rust-foundations; \
    echo "--- gate: the library and binaries must compile ---"; \
    cargo build; \
    echo "--- informational: test targets, tests, lints ---"; \
    # Per target, not a plain `cargo test`: one test target that does not
    # compile aborts the whole run, and then nothing is reported at all.
    ok=0; bad=0; pass=0; failed=0; \
    for t in tests/*.rs; do \
        [ -e "$t" ] || continue; \
        name=$(basename "$t" .rs); \
        if ! cargo test --test "$name" --no-run >/dev/null 2>&1; then \
            bad=$((bad+1)); echo "  test target does not compile (expected for some steps): $name"; \
            continue; \
        fi; \
        ok=$((ok+1)); \
        line=$(cargo test --test "$name" 2>&1 | grep -m1 '^test result:' || true); \
        pass=$((pass + $(echo "$line" | awk '{print $4+0}'))); \
        failed=$((failed + $(echo "$line" | awk '{print $6+0}'))); \
    done; \
    echo "  test targets: $ok compile, $bad do not"; \
    echo "  tests: $pass passed, $failed failed (a starter is expected to fail most)"; \
    cargo clippy -- -D warnings >/dev/null 2>&1 && echo "  clippy: clean" || echo "  clippy: findings in the starter (not fatal)"; \
    cargo fmt --check >/dev/null 2>&1 && echo "  rustfmt: clean" || echo "  rustfmt: not clean (not fatal)"; \
    cd /home/coder/workspace; \
    rm -rf /home/coder/workspace/rust-foundations/target; \
    mv /home/coder/workspace/rust-foundations /opt/cads-seed/rust-foundations; \
    du -sh /opt/cads-seed/rust-foundations

# JavaScript. Same reasoning: the starter's exercises throw or carry the bug
# the step is about, so `node --test` exits non-zero by design. The gate is
# that the runner starts and produces a summary; the counts are recorded.
RUN set -eu; \
    mv /opt/cads-seed/javascript-foundations /home/coder/workspace/javascript-foundations; \
    cd /home/coder/workspace/javascript-foundations; \
    if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; fi; \
    node --test > /tmp/node-test.log 2>&1 || true; \
    grep -E '^# (tests|pass|fail)' /tmp/node-test.log | sed 's/^/  /' \
        || { echo "node --test produced no summary - the runner itself is broken:"; tail -30 /tmp/node-test.log; exit 1; }; \
    rm -f /tmp/node-test.log; \
    cd /home/coder/workspace; \
    mv /home/coder/workspace/javascript-foundations /opt/cads-seed/javascript-foundations; \
    du -sh /opt/cads-seed/javascript-foundations

############################################################################
# final image
############################################################################
FROM base

# CodeLLDB (vadimcn.vscode-lldb) for debugging Rust tests. Open VSX only
# carries the "bootstrap" VSIX, which downloads the 55 MB platform package
# from GitHub on first activation - not acceptable for the lab. The
# platform-specific VSIX from the GitHub release is pinned by version and
# SHA-256 instead (checksums computed 2026-09-03 from the release assets).
ARG CODELLDB_VERSION=1.12.3
ARG CODELLDB_SHA256_AMD64=1cd7f386598022b51a5b93b9ffa23e812b23f519cfe1833384ec4bef4bfd1be1
ARG CODELLDB_SHA256_ARM64=0887f67d440554617894266f80706b700907c36b95e6e49d23b95a0e05318101
ARG TARGETARCH

USER root
COPY --chmod=0755 images/tutor-lab/entrypoint.d/ /entrypoint.d/
COPY --chown=coder:coder images/tutor-lab/vscode-templates/ /opt/cads-seed/vscode-templates/
COPY --from=seed --chown=coder:coder /opt/cads-tutor/courses /opt/cads-tutor/courses
COPY --from=seed --chown=coder:coder /opt/cads-seed /opt/cads-seed
COPY --from=seed --chown=coder:coder /home/coder/.cargo/registry /home/coder/.cargo/registry
RUN mkdir -p /home/coder/workspace && chown coder:coder /home/coder/workspace; \
    ls -d /opt/cads-tutor/courses/*/ 2>/dev/null || echo "no course packs in this image"; \
    ls -d /opt/cads-seed/*/

# Extensions are installed as `coder` (code-server resolves its extension
# directory from $HOME, the container runs as coder).
USER coder

# Open VSX: rust-analyzer ships the server binary in its platform VSIX
# (linux-x64 / linux-arm64 are published), ESLint is universal.
#
# even-better-toml is not a nicety: neither code-server nor rust-analyzer
# contributes a TOML grammar, so without it Cargo.toml opens as "Plain Text" -
# no colours, no structure - in a course whose very first file is Cargo.toml.
# It also brings the Cargo schema, so keys are completed and typos underlined.
RUN set -eu; for ext in \
        rust-lang.rust-analyzer \
        dbaeumer.vscode-eslint \
        tamasfe.even-better-toml \
    ; do code-server --install-extension "$ext"; done; \
    test -x /home/coder/.local/share/code-server/extensions/rust-lang.rust-analyzer-*/server/rust-analyzer; \
    # the TOML extension is only worth its size if it really claims .toml
    grep -q '"toml"' /home/coder/.local/share/code-server/extensions/tamasfe.even-better-toml-*/package.json

RUN set -eu; \
    case "${TARGETARCH}" in \
        amd64) arch=x64;   sha="${CODELLDB_SHA256_AMD64}" ;; \
        arm64) arch=arm64; sha="${CODELLDB_SHA256_ARM64}" ;; \
        *) echo "unsupported TARGETARCH=${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    vsix="codelldb-linux-${arch}.vsix"; \
    curl -fSL --retry 5 --retry-delay 5 -o "/tmp/${vsix}" \
        "https://github.com/vadimcn/codelldb/releases/download/v${CODELLDB_VERSION}/${vsix}"; \
    echo "${sha}  /tmp/${vsix}" | sha256sum -c -; \
    code-server --install-extension "/tmp/${vsix}"; \
    rm -f "/tmp/${vsix}"

# cads-tutor VSIX (built by the tutor stream / CI into extensions/cads-tutor/dist).
# Tolerant: no VSIX -> image without the tutor, "CaDS extensions installed: 0".
RUN --mount=type=bind,target=/ctx \
    set -eu; n=0; \
    for vsix in /ctx/extensions/cads-tutor/dist/*.vsix; do \
        [ -e "$vsix" ] || continue; \
        echo "installing $vsix"; code-server --install-extension "$vsix"; n=$((n+1)); \
    done; \
    echo "CaDS extensions installed: $n"; \
    code-server --list-extensions --show-versions

# User settings (same policy as the firmware image: no trust prompt, no
# startup editor, no chat side bar, no update/telemetry noise).
COPY --chown=coder:coder images/tutor-lab/settings/user-settings.json /home/coder/.local/share/code-server/User/settings.json

ENV CADS_WORKSPACE_ROOT=/home/coder/workspace \
    CADS_WORKSPACE_FILE=/home/coder/workspace/cads-tutor.code-workspace

WORKDIR /home/coder/workspace

# Loopback only on the host side (compose / docker run map 127.0.0.1:808x).
EXPOSE 8080

# Full CMD in the image so a plain `docker run` is correct (the lab deployment
# uses no compose): without --disable-workspace-trust a fresh profile opens in
# Restricted Mode with every extension disabled. The multi-root workspace file
# is written by entrypoint.d/10-seed-workspaces.sh on first start.
CMD ["--bind-addr", "0.0.0.0:8080", \
     "--app-name", "CaDS Tutor Lab", \
     "--disable-workspace-trust", \
     "--disable-telemetry", \
     "--disable-update-check", \
     "/home/coder/workspace/cads-tutor.code-workspace"]
