<?php
ini_set('max_execution_time', 900); //wait for nax of 15minutes for the script to complete
require '../vendor/autoload.php';
use Symfony\Component\Process\Process;

if (isset($_POST['videoUrl']))
{
		$ipAddr_userAgent = $_POST['uniqueId'];
		$videoUrl = $_POST['videoUrl'];
		$availableFormats = json_decode($_POST['availableFormats'], true);
		$selectedFormat = $_POST["videoFormat"];
		$videoId = $_POST['videoId'];

		//get stream url from available formats
		$streamUrl = $availableFormats[$selectedFormat]["STREAM-URL"];

		$metadata = $availableFormats["metadata"];

		//Send the response to client and proceed with video generation
		respondOK();

		/* $progress = array();
		$progress['videoId'] = $videoId;
		$progress['data'] = nl2br($data);
		$progress['playlistId'] = $playlistId;
		$progress['videoUrl'] = $videoUrl; */

		$videoTitle = $_POST['title'];
		$videoDescription = $_POST['description'];

		$outputFileName = $videoId . ".mp4";

		$zipOutputQuery = "zip -D -m -9 -v " . $videoId . ".zip " . $outputFileName;

		//$videoStreamQuery = "./ffmpeg -i \"" . $streamUrl . "\" -c copy -metadata title=\"" . $videoTitle . "\" -metadata episode_id=\"" . $playlistId . "\" -metadata track=\"" . $videoId . "\" -metadata description=\"" . $videoDescription . "\" -metadata synopsis=\"" . $videoDescription . "\" " . $outputFileName;
		
		$videoStreamQuery = "./ffmpeg -i \"" . $streamUrl . "\" -c copy";
		
		foreach ($metadata as $metaDataName => $metaDataValue)
		{
				$videoStreamQuery .= " -metadata " . $metaDataName . "=\"" . $metaDataValue . "\"";
		}

		$videoStreamQuery .= " " . $outputFileName;

		$process = new Process($videoStreamQuery);
		$process->setTimeout(30 * 60); //wait for atleast dyno inactivity time for the process to complete
		$process->start();

		foreach ($process as $type => $data)
		{
				$progress = array();
				$progress['videoId'] = $videoId;
				$progress['data'] = nl2br($data);
				sendProgressToClient($progress, $ipAddr_userAgent);
		}

		$process = new Process($zipOutputQuery);
		$process->setTimeout(30 * 60); //wait for atleast dyno inactivity time for the process to complete
		$process->start();

		foreach ($process as $type => $data)
		{
				$progress = array();
				$progress['videoId'] = $videoId;
				$progress['data'] = nl2br($data);
				sendProgressToClient($progress, $ipAddr_userAgent);
		}

		$progress = array();
		$progress['videoId'] = $videoId;
		$progress['data'] = nl2br("\nVideo generation complete...");

		sendProgressToClient($progress, $ipAddr_userAgent);

}
else
{

		echo "Invalid script invocation";
		$ipAddr_userAgent = $_POST['uniqueId'];
		$progress = array();
		$progress['hasProgress'] = 'false';
		$progress['data'] = nl2br("Error occurred in receiving the post form data from the client");

		sendProgressToClient($progress, $ipAddr_userAgent);

}

/**
 * Respond 200 OK with an optional
 * This is used to return an acknowledgement response indicating that the request has been accepted and then the script can continue processing
 *
 * @param null $text
 */
function respondOK($text = null)
{
		// check if fastcgi_finish_request is callable
		if (is_callable('fastcgi_finish_request'))
		{
				if ($text !== null)
				{
						echo $text;
				}
				/*
				 * http://stackoverflow.com/a/38918192
				 * This works in Nginx but the next approach not
				*/
				session_write_close();
				fastcgi_finish_request();

				return;
		}

		ignore_user_abort(true);

		ob_start();

		if ($text !== null)
		{
				echo $text;
		}

		$serverProtocol = filter_input(INPUT_SERVER, 'SERVER_PROTOCOL', FILTER_SANITIZE_STRING);
		header($serverProtocol . ' 200 OK');
		// Disable compression (in case content length is compressed).
		header('Content-Encoding: none');
		header('Content-Length: ' . ob_get_length());

		// Close the connection.
		header('Connection: close');

		ob_end_flush();
		ob_flush();
		flush();
}

function sendProgressToClient($progress, $ipAddr_userAgent)
{
		$options = array(
				'cluster' => 'ap2',
				'useTLS' => true
		);
		$pusher = new Pusher\Pusher('a44d3a9ebac525080cf1', '37da1edfa06cf988f19f', '505386', $options);

		$message['message'] = $progress;

		$pusher->trigger('hotstar-video-download-v2', $ipAddr_userAgent, $message);
}

?>