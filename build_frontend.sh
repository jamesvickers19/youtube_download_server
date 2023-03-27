#!/usr/bin/env bash

# do in subshell so it doesn't change terminal directory
(cd frontend && yarn build && mv build ../server/app/static)