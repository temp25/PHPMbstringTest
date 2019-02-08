<?php
include 'vendor/autoload.php';
use Symfony\Component\Process\Process;

/**
 * Respond 200 OK with an optional
 * This is used to return an acknowledgement response indicating that the request has been accepted and then the script can continue processing
 *
 * @param null $text
 */
function respondOK($text = null) {
    // check if fastcgi_finish_request is callable
    if (is_callable('fastcgi_finish_request')) {
        if ($text !== null) {
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
    
    if ($text !== null) {
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

if(isset($_POST)){
	$authCode = urldecode($_POST["authCode"]);
	$videoFileName = $_POST["fileName"];
	$gdriveUploadCommand = "php gdrive.php ".$authCode." ".$videoFileName;
	$gdriveUploadOutput = shell_exec($gdriveUploadCommand);
	echo $gdriveUploadOutput;
}