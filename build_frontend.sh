#!/usr/bin/env bash

# do in subshell so it doesn't change terminal directory
(cd frontend && yarn build && rm -r ../server/app/static && mv build ../server/app/static)