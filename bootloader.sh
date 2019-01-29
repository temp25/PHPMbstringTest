#!/bin/sh

echo "Downloading ffmpeg latest release from johnvansickle.com"
wget -q https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -O ffmpeg.tar.xz
tar --wildcards --strip-components=1 -xf ffmpeg.tar.xz ffmpeg-4.1-64bit-static/ff*
chmod +x ff*
echo "ffmpeg libs downloaded and installed successfully"
heroku-php-apache2
