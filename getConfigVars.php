<?php
	$dbApiKey = getenv('DROPBOX_API_KEY');
	$configs = array('dbKey' => $dbApiKey); // array(key1 => value1, key2 => value2)
	echo json_encode($configs);
?>