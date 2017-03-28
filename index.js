var fs = require("fs");
var glob = require("glob");
var archiver = require('archiver');
var usage = require('usage');
var monitor = require('event-loop-monitor');

console.log("\nZipping PDFs…\n");

configureEventLoopMonitor();

const resultsPath = "./results.csv";
removeExistingFile(resultsPath);

const compression = 1;	// 0 - 9
const sourceDir = "./source-pdfs";
const pdfFileFilter = sourceDir + "/*.pdf";
const files = glob.sync(pdfFileFilter);

appendToResultsFile("File Count\tCompression\tDuration (s)\tAvg File Size (mb)\tAvg Mem (mb)\tCpu (%)\t\tArchive (mb)");
var todo = files.slice(0, 100);
processFiles(todo, compression);

function configureEventLoopMonitor() {
	const filePath = "./eventloop-results.csv";
	removeExistingFile(filePath);

	fs.appendFile(filePath, "p50 (ms), p90 (ms), p95 (ms), p99 (ms), p100 (ms)\n", function(err) {});

	monitor.on('data', function(latency) {
		var data = latency.p50 + ", " + latency.p90 + ", " + latency.p95 + ", " + latency.p99 + ", " + latency.p100 + "\n";
		fs.appendFile(filePath, data, function(err) {});
	});

	// Interval on 1s.
	monitor.resume(1000);
}

function removeExistingFile(path) {
	if (fs.existsSync(path)) {
		fs.unlinkSync(path);
	}
}

function appendToResultsFile(data) {
	console.log(data);
}

function processFiles(files, compression) {
	const archivePath = "./archive.zip";
	var totalFileSizeCount = 0;
	var totalMemoryUsage = 0;
	const fileCount = files.length;

	removeExistingFile(archivePath);

	var startTime = process.hrtime();
	var output = fs.createWriteStream(archivePath);
	var archive = archiver("zip", {
		store: true
	});

	output.on("close", function() {
		const duration = process.hrtime(startTime);
		const archiveFileSize = fileSize(archivePath);
		const averageFileSize = totalFileSizeCount / fileCount;
		const averageMemoryUsed = totalMemoryUsage / fileCount;

		const formattedArchiveFileSize = bytesToMegabytes(archiveFileSize);
		const formattedDuration = roundToPrecision(duration[0] + (duration[1] / 1000000000), 3);
		const formattedAverageFileSize = bytesToMegabytes(averageFileSize);
		const formattedAverageMemoryUsed = bytesToMegabytes(averageMemoryUsed);

		usage.lookup(process.pid, function(err, result) {
			var cpuPercentage = result['cpu'];
			appendToResultsFile(fileCount + "\t\t" + compression + "\t\t" + formattedDuration + "\t\t" + formattedAverageFileSize + "\t\t\t" + formattedAverageMemoryUsed + "\t\t" + cpuPercentage + "\t\t\t" + formattedArchiveFileSize);
			
			monitor.stop();
		});		
	});

	archive.on("error", function(err) {
		console.log("Error processing " + err);
		throw err;
	});

	archive.pipe(output);

	for (var i = 0; i < fileCount; i++) {
		var filePath = files[i];
		var size = fileSize(filePath);
		var filename = "test-" + i + ".pdf";
		totalFileSizeCount += size;

		archive.file(filePath, {
			"name": filename
		});

		const memory = process.memoryUsage();
		totalMemoryUsage += memory.heapUsed;
	}

	archive.finalize();
}

function roundToPrecision(value, decimalPlaces) {
	const precision = Math.pow(10, decimalPlaces);
	return Math.round(value * precision) / precision;
}

function bytesToMegabytes(bytes) {
	var megabytes = bytes / 1000000;
	return roundToPrecision(megabytes, 2);
}

function fileSize(path) {
	var stats = fs.statSync(path);
	return stats["size"];
}
