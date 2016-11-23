<?php

/**
 * This script is used to generate some rough PDF zipping duration values
 * for a research task on a Technical Design Document.
 */
printf("Zipping PDFs…\n");
unlink("./results.csv");

$compressionTests = [0, 5, 9];
$sourceDir = "./source-pdfs";
$pdfFileFilter = "$sourceDir/*.pdf";
$files = glob($pdfFileFilter);

// Determine how many iterations we need. We will increase by 2^i, where 'i' is a 
// positive integer.
$fileCount = count($files);
$maxCount = ceil(log($fileCount, 2)) + 1;

// Create and append the first line of the results file.
appendToResultsFile("File Count, Compression, Duration (s), Average File Size (mb), Archive File Size (mb)");

// Iterate over all the compression levels we're interested in.
for ($i = 0; $i < count($compressionTests); $i++) { 
	$compression = $compressionTests[$i];

	// Iterate over all the file counts we're interested in for a decent data set.
	for ($j = 0; $j < $maxCount; $j++) {
		$k = pow(2, $j);

		// Bound to the max file count.
		if ($k > $fileCount) {
			$k = $fileCount;
		}

		$filesToProcess = array_slice($files, 0, $k);
		processFiles($filesToProcess, $compression);
	}
}

function appendToResultsFile($data) {
	$appendData = $data.PHP_EOL;
	file_put_contents("./results.csv", $appendData, FILE_APPEND);
}

function processFiles($files, $compression) {
	$archiveName = "./archive.zip";
	$totalFileSizeCount = 0;	

	if (file_exists($archiveName)) {
		unlink($archiveName);
	}

	$startTime = microtime(true);
	foreach ($files as $filename) {
		$totalFileSizeCount += filesize($filename);		
		exec("zip -q -$compression $archiveName $filename");
	}
	$endTime = microtime(true);

	$fileCount = count($files);
	$averageFileSize = bytesToMegabytes($totalFileSizeCount / $fileCount);
	$duration = round($endTime - $startTime, 4);
	$archiveFileSize = bytesToMegabytes(filesize($archiveName));

	appendToResultsFile("$fileCount, $compression, $duration, $averageFileSize, $archiveFileSize");
}

function bytesToMegabytes($bytes) {
	return round($bytes / 1000 / 1000, 2);
}