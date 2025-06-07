#!/bin/bash

echo "Installing yt-dlp..."
apt-get update
apt-get install -y curl python3 python3-pip
pip3 install -U yt-dlp

echo "yt-dlp installed"
