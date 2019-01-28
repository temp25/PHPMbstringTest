#!/bin/sh

wget -q https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -O ffmpeg.tar.xz
tar --wildcards --strip-components=1 -xf ffmpeg.tar.xz ffmpeg-4.1-64bit-static/ff*
chmod +x ff*
heroku-php-apache2
