<?php
require 'vendor/autoload.php';
use Symfony\Component\Process\Process;

echo hash("sha256", $_POST["streamUrl"]);//var_export($_POST, true);

?>
