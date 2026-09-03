# ct-agent, pinned by version and fetched at build time (identical recipe to
# CADS-kali-desktop/agent/Dockerfile).  The released binary is dynamically linked against glibc
# only (rustls in-process), so a slim Debian base plus ca-certificates is sufficient.
#
# No subcommand as CMD on purpose: `ct-agent` alone is the routing-token serve mode, compose passes
# `onboard` for the first run (redeem the single-use join token, then serve).
FROM debian:stable-slim

ARG CT_AGENT_VERSION=v0.5.3
ARG CT_AGENT_ARCH=linux-x86_64

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* \
 && curl -fsSL -o /usr/local/bin/ct-agent \
      "https://github.com/scimbe/ct-agent/releases/download/${CT_AGENT_VERSION}/ct-agent-${CT_AGENT_ARCH}" \
 && chmod +x /usr/local/bin/ct-agent \
 && apt-get purge -y curl && apt-get autoremove -y \
 && mkdir -p /var/lib/ct-agent \
 && /usr/local/bin/ct-agent --version

ENTRYPOINT ["/usr/local/bin/ct-agent"]
