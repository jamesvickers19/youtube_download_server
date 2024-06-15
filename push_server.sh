#!/usr/bin/env bash

set -e

bash build_frontend.sh

scp -r nginx root@143.198.76.231:/youtube-downloader/

scp -r server/app root@143.198.76.231:/youtube-downloader/server

scp .env docker-compose.yml root@143.198.76.231:/youtube-downloader/

scp server/Dockerfile server/requirements.txt root@143.198.76.231:/youtube-downloader/server