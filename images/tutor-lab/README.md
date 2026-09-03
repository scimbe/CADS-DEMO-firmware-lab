# CaDS Tutor Lab image (`ghcr.io/scimbe/cads-tutor-lab`)

The second lab image of this monorepo, for the language tracks **rust-foundations** and
**javascript-foundations** (SPEC.md Addendum v1.1 A4). It replaces the separate
`CADS-DEMO-tutor-lab` repository. The firmware image (`Dockerfile` at the repository root,
`ghcr.io/scimbe/cads-firmware-lab`) is unrelated at runtime; the two share the `cads-tutor`
extension, the user-settings policy and the CI shape.

| | |
|---|---|
| Base | `codercom/code-server:latest` (Debian 13), multi-arch amd64 + arm64 |
| Toolchains | rustup `stable` (profile minimal + rustfmt, clippy, rust-src; no rust-docs), Node 22 (official tarball, SHA-256 checked), build-essential, pkg-config, libssl-dev, python3, git |
| Extensions | `rust-lang.rust-analyzer` (Open VSX, platform VSIX with bundled server), `dbaeumer.vscode-eslint` (Open VSX), `vadimcn.vscode-lldb` (CodeLLDB 1.12.3, platform VSIX from the GitHub release, SHA-256 pinned – Open VSX only has the bootstrap that downloads at runtime), `cads.cads-tutor` (VSIX from `extensions/cads-tutor/dist`) |
| Course packs | `courses/rust-foundations`, `courses/javascript-foundations` → `/opt/cads-tutor/courses/` (the firmware packs are **not** in this image) |
| Workspaces | `workspaces/rust-foundations`, `workspaces/javascript-foundations` → `/opt/cads-seed/<name>`, seeded to `/home/coder/workspace/<name>` on first start; `cads-tutor.code-workspace` (multi-root, both folders) is what code-server opens |
| Warm caches | the image build runs `cargo build --all-targets && cargo test` in the Rust seed and `node --test` (plus `npm ci` when there is a lock file) in the JavaScript seed; `target/` and `~/.cargo/registry` ship in the image |
| Port | container 8080, host loopback `127.0.0.1:8084` (lab) / `127.0.0.1:8089` (development machine) |
| Env | `PASSWORD` (required), `TUTOR_LLM_BASE_URL` / `TUTOR_LLM_API_KEY` / `TUTOR_LLM_MODEL` (optional, LLM for the tutor), `CADS_TUTOR_TELEMETRY_URL` / `CADS_TUTOR_TELEMETRY_TOKEN` (optional, SPEC A5 teacher portal; unset = events stay local) |

Verification log, sizes and deviations: [docs/TUTOR-LAB-NOTES.md](../../docs/TUTOR-LAB-NOTES.md).

## Layout

```
images/tutor-lab/
├── Dockerfile                    multi-stage: base (packages, Node, Rust) → seed (packs, workspaces, warm build) → final
├── docker-compose.yml            runtime only: password, env, volume, 127.0.0.1:8084
├── entrypoint.d/10-seed-workspaces.sh   seeds both workspaces, writes .vscode/settings.json + the .code-workspace
├── settings/user-settings.json   ~/.local/share/code-server/User/settings.json (trimmed copy of image/settings)
├── vscode-templates/             per-workspace settings templates + cads-tutor.code-workspace
└── seed-fallback/                PLACEHOLDER workspaces, used only when workspaces/<name> is absent at build time
```

Related: `scripts/run-local-tutor-lab.sh` (build + run on 8089), `e2e/tutor-lab-smoke.mjs`
(headless browser smoke test), `.github/workflows/image-tutor-lab.yml` (CI).

## Build locally

The build context is the **repository root** (it needs `courses/`, `workspaces/`,
`extensions/cads-tutor/dist`). No secrets are needed.

```bash
# packages the cads-tutor VSIX if missing, builds, starts on 127.0.0.1:8089
TUTOR_LAB_PASSWORD=secret scripts/run-local-tutor-lab.sh
# only build
scripts/run-local-tutor-lab.sh --build-only
# plain docker
docker build -f images/tutor-lab/Dockerfile -t cads-tutor-lab:dev .
```

Build arguments: `RUST_TOOLCHAIN` (default `stable`; pin a version such as `1.91.0` for a
reproducible image), `NODE_VERSION` + `NODE_SHA256_*`, `CODELLDB_VERSION` + `CODELLDB_SHA256_*`.
When bumping Node or CodeLLDB, update the checksums (`SHASUMS256.txt` on nodejs.org; for CodeLLDB
compute `sha256sum` of the downloaded release asset – the project publishes no checksum file).

If `workspaces/<name>` is missing in the checkout the image seeds the placeholder from
`seed-fallback/` and says so in the build log and at container start
(`[cads-seed] note: ... PLACEHOLDER ...`); the placeholder carries a `PLACEHOLDER.md`. Missing
course packs are reported in the build log and simply absent from `/opt/cads-tutor/courses`.

## Run

```bash
cd images/tutor-lab
printf 'TUTOR_LAB_PASSWORD=%s\n' "$(openssl rand -hex 12)" > .env   # + TUTOR_LLM_*, CADS_TUTOR_TELEMETRY_* if wanted
docker compose up -d          # image: ghcr.io/scimbe/cads-tutor-lab:${TUTOR_LAB_TAG:-next}
open http://127.0.0.1:8084
```

or without compose (this is what the lab deployment does):

```bash
docker run -d --name tutor-lab --restart unless-stopped \
  -p 127.0.0.1:8084:8080 \
  -e PASSWORD=... \
  -e TUTOR_LLM_BASE_URL= -e TUTOR_LLM_API_KEY= -e TUTOR_LLM_MODEL= \
  -e CADS_TUTOR_TELEMETRY_URL= -e CADS_TUTOR_TELEMETRY_TOKEN= \
  -v tutor-lab-workspace:/home/coder/workspace \
  ghcr.io/scimbe/cads-tutor-lab:<tag>
```

The image's `CMD` already carries `--bind-addr 0.0.0.0:8080 --app-name "CaDS Tutor Lab"
--disable-workspace-trust --disable-telemetry --disable-update-check
/home/coder/workspace/cads-tutor.code-workspace`; do not override it.

## Deploy / update on the lab host

1. Take the tag from the CI run (`next-<shortsha>` on branch `next`, `latest` after a merge to
   `main`; see `.github/workflows/image-tutor-lab.yml`).
2. In the compose file (or the `docker run` line) set `image: ghcr.io/scimbe/cads-tutor-lab:<tag>`.
3. `docker compose pull && docker compose up -d` (or `docker pull` + `docker rm -f` + `docker run`).
   The workspace volume survives; existing student workspaces are **not** re-seeded, only the
   image-managed `.vscode/settings.json` files are refreshed (marker line, see entrypoint script).

Verification after a deploy (2 minutes):

```bash
docker logs tutor-lab 2>&1 | grep '\[cads-seed\]'          # "ready: /home/coder/workspace/cads-tutor.code-workspace"
docker exec tutor-lab bash -lc 'cargo --version; node --version; code-server --list-extensions --show-versions'
docker exec tutor-lab bash -lc 'cd ~/workspace/rust-foundations && time cargo test'      # seconds, not minutes
docker exec tutor-lab bash -lc 'cd ~/workspace/javascript-foundations && node --test'    # "# fail 0"
docker exec tutor-lab ls /opt/cads-tutor/courses                                          # rust-foundations javascript-foundations
```

In the browser: log in, the title reads `cads-tutor (Workspace) — CaDS Tutor Lab`, the Explorer
lists *Rust Foundations* and *JavaScript Foundations*, no "Restricted Mode", the CaDS Tutor icon
is in the activity bar and opens the first course step. The full check is
`CADS_LAB_PASSWORD=... CADS_LAB_URL=http://127.0.0.1:8084 CADS_LAB_CONTAINER=tutor-lab node e2e/tutor-lab-smoke.mjs`.

## What is deliberately not in the image

- No firmware toolchain, no course packs `cads-zero-*`, no board bridge / probe extensions.
- No `rust-docs` component (≈700 MB) – The Rust Programming Language is linked from the course.
- No global `eslint`: the ESLint extension is enabled per workspace only when that workspace has
  an ESLint configuration (then `npm ci` in the seed build installs it from the lock file).
- No corepack shims (`yarn`/`pnpm` would try to download on first use).
