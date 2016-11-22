<?php

printf("Zipping PDFs…\n");

$pdfFiles = [];
$compression = compressionSetting($argv);
$totalFileSizeCount = 0;
$archiveName = "archive.zip";

if (file_exists($archiveName)) {
	unlink($archiveName);
}

$startTime = microtime(true);
foreach (glob('./*.pdf') as $filename) {
	$pdfFiles[] = $filename;
	$filePath = "./$filename";
	$totalFileSizeCount += filesize($filePath);
	
	exec("zip -q -$compression $archiveName $filePath");
}
$endTime = microtime(true);

$count = count($pdfFiles);
$averageFileSize = bytesToMegabytes($totalFileSizeCount / $count);
$duration = round($endTime - $startTime, 4);
$archiveFileSize = bytesToMegabytes(filesize($archiveName));

// export results as a csv
// File Count, 

printf(" - Zipped $count files\n");
printf(" - Average file size: ".$averageFileSize."mb\n");
printf(" - Duration: ".$duration."s\n");
printf(" - Compression: $compression out of 9\n");
printf(" - Archive file size: ".$archiveFileSize."mb\n");

function compressionSetting($consoleArguments) {
	$noCompression = 0;
	$maxCompression = 9;
	$compression = $consoleArguments[1];

	if ( ! isset($compression)) {
		return $noCompression;
	} else if ($compression < $noCompression) {
		return $noCompression;
	} else if ($compression > $maxCompression) {
		return $maxCompression;
	} else {
		return $consoleArguments[1];
	}
}

function bytesToMegabytes($bytes) {
	return round($bytes / 1000 / 1000, 2);
}