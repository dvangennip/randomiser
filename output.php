<?php
// Tested on PHP 5.3
// error_reporting(E_ALL);

// All external variables are gathered here
//
$outputType = $_POST['t'];
$fileContent = $_POST['f'];
$fileName = $_POST['n'];
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Determine whether this is a valid request
// ($ok should still be 0 after all checks)
//
$ok = 0;
// Only POST requests are accepted
if ($requestMethod != "POST") {
	$ok = ($ok+1);
}
// a file name must be of the form <some word characters>.<an extension>
if (!preg_match("/^\w+\.\w{2,5}$/", $fileName)) {
	$fileName = "error.txt";
}
// content must have some length
if (strlen($fileContent) == 0) {
	$fileContent = "No content was given";
}

// Printing to browser
//
// printing header with octet-stream as content type, so a browser will accept it as a file
header('Content-type: application/octet-stream; charset=utf-8');
header('Content-Disposition: attachment; filename="'.$fileName.'"');
if ($ok == 0) {
	echo $fileContent;
} else {
	echo "Only POST requests are supported (error code: " . $ok . ")";
}
?>