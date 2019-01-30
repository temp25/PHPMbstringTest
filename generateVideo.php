<?php
require 'vendor/autoload.php';
use Symfony\Component\Process\Process;
use Blocktrail\CryptoJSAES\CryptoJSAES;

$passphrase = "my passphrase";
echo CryptoJSAES::decrypt($_POST["streamUrl"], $passphrase);

?>
