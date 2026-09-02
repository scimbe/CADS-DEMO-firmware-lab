# scripts/

- `run-local.sh` – build the image (BuildKit secret from `gh auth token` for the
  private cads-zero clone) and run it on `127.0.0.1:8084` with the values from
  `.env`. `--fresh` re-seeds the workspace volume, `--stop` removes the container,
  `--build-only` / `--no-cache` for image work. Port 8083 is the lab/tunnel port
  of the older deployment on this machine and is deliberately not touched.
- Shim tests (no Docker needed): `python3 -m unittest discover -s tests/shims -v`.
- Other streams add `build-all` / `package-vsix` here (SPEC.md §7).
