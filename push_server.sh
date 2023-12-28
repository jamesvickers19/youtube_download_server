#!/usr/bin/env bash

bash build_frontend.sh && scp -r server root@143.198.76.231:/youtube-downloader/ && scp -r nginx root@143.198.76.231:/youtube-downloader/