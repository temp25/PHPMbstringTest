#!/bin/sh

FFMPEG_BUILD_NAME=ffmpeg.tar.xz

echo "Downloading FFMPEG static build latest release from johnvansickle.com"
wget -q https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -O $FFMPEG_BUILD_NAME
RESULT=$?
if [ $RESULT -ne 0 ]; then
	echo "Cannot download FFMPEG latest release from https://johnvansickle.com site"
	exit 1 # terminate and indicate error
fi
echo "Downloaded static build and saved it as $FFMPEG_BUILD_NAME"

echo "Extracting static build extract $FFMPEG_BUILD_NAME"
tar --wildcards --strip-components=1 -xf $FFMPEG_BUILD_NAME ffmpeg*/ff*
RESULT=$?
if [ $RESULT -ne 0 ]; then
	echo "Error occurred in extracting $FFMPEG_BUILD_NAME"
	exit 2 # terminate and indicate error
fi
echo "Extraction completed successfully"

echo "Removing build extract $FFMPEG_BUILD_NAME"
rm -rf "$FFMPEG_BUILD_NAME"
echo "Removed build extract $FFMPEG_BUILD_NAME"

#converting static binaries to executables
chmod +x ff*

#adding them to path variables
export PATH="$PATH:`pwd`/ffmpeg:`pwd`/ffprobe"
echo "FFMPEG libs installed successfully"

heroku-php-apache2  #start web server