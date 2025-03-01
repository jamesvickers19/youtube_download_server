#!/usr/bin/env bash

set -e

bash build_frontend.sh

ADDRESS=142.93.8.222

scp -r nginx root@${ADDRESS}:/youtube-downloader/

scp -r server/app/* root@${ADDRESS}:/youtube-downloader/server/app

scp server/cleanup_download_files.sh root@${ADDRESS}:/youtube-downloader/server

scp server/Dockerfile.file_cleaner root@${ADDRESS}:/youtube-downloader/server

scp .env docker-compose.yml redeploy_server.sh init-letsencrypt.sh root@${ADDRESS}:/youtube-downloader/

scp server/Dockerfile server/requirements.txt root@${ADDRESS}:/youtube-downloader/server