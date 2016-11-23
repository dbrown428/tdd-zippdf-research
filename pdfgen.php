<?php

/**
 * This script is used to setup the conditions needed for a 
 * performance script. Used on OS X to convert an image to a PDF (1:1 
 * conversion). This will convert all image files in a directory to
 * corresponding PDFs.
 */
printf("Generating PDFs…\n");

$sourceDir = "./source-images";
$targetDir = "./source-pdfs";
$count = 0;

foreach (glob("$sourceDir/*.jpg") as $filename) {
	$targetPath = "$targetDir/$count.pdf";
	exec("convert $filename $targetPath");
	$count += 1;
}

printf(" - $count pdfs generated\n\n");
