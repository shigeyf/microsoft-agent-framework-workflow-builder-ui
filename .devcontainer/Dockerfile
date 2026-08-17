# Dev Container Dockerfile

FROM mcr.microsoft.com/devcontainers/typescript-node:22-bookworm

ARG UV_VERSION=0.12.3

RUN apt-get update \
    && apt-get install -y --no-install-recommends pipx \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV PIPX_HOME=/opt/pipx
ENV PIPX_BIN_DIR=/usr/local/bin


RUN pipx install pre-commit \
    && pipx install "uv==${UV_VERSION}"
