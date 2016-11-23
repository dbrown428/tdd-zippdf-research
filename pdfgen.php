<?php

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
