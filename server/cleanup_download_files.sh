#!/bin/sh

# Directory to clean
DIR="/tmp"

# Find and remove files older than 10 minutes
echo "[$(date)] Cleaning up files older than 10 minutes in $DIR"

find "$DIR" -type f -mmin +10 -delete
