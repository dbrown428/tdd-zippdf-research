var fs = require("fs");
var glob = require("glob");
var usage = require('usage');
var async = require('async');
var cmd = require('child_process');
var monitor = require('event-loop-monitor');

console.log("\nZipping PDFs…\n");
configureEventLoopMonitor();

const sourceDir = "./source-pdfs";
const resultsPath = "./results.csv";
const archivePath = "./archive.zip";

removeExistingFile(resultsPath);
removeExistingFile(archivePath);

const compression = 1;	// 0 - 9
const pdfFileFilter = sourceDir + "/*.pdf";
const files = glob.sync(pdfFileFilter);

appendToResultsFile("File Count\tCompression\tDuration (s)\tAvg Mem (mb)\tAvg Cpu (%)\tArchive (mb)");
var todo = files.slice(0, 100);
// addIndividualFiles(todo, compression);
addBatchFiles(todo, compression, 200);

function configureEventLoopMonitor() {
	const filePath = "./eventloop-results.csv";
	removeExistingFile(filePath);

	fs.appendFile(filePath, "p50 (ms), p90 (ms), p95 (ms), p99 (ms), p100 (ms)\n", function(err) {});

	monitor.on('data', function(latency) {
		var data = latency["p50"] + ", " + latency["p90"] + ", " + latency["p95"] + ", " + latency["p99"] + ", " + latency["p100"] + "\n";
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

function addBatchFiles(files, compression, batchSize) {
	const fileCount = files.length;
	var totalCpuUsage = 0;
	var totalMemoryUsage = 0;
	var startTime = process.hrtime();
	var divisions = Math.ceil(files.length / batchSize);
	var batchedTasks = [];

	for (var i = 0; i < divisions; i++) {
		var start = i * batchSize;
		var end = start + batchSize;

		if (end > files.length) {
			end = files.length;
		}

		var fileBatch = files.slice(start, end);
		var batch = fileBatch.join(" ");
		var task = "zip -q -" + compression + " " + archivePath + " " + batch;
		batchedTasks.push(task);
	}

	async.eachSeries(batchedTasks, function(task, callback) {
		cmd.exec(task, function(error, stdout, stderr) {
			const memory = process.memoryUsage();
			totalMemoryUsage += memory.heapUsed;
			callback(error);
		});
	}, function(err, results) {
		const duration = process.hrtime(startTime);
		const archiveFileSize = fileSize(archivePath);
		const averageMemoryUsed = totalMemoryUsage / divisions;

		const formattedArchiveFileSize = bytesToMegabytes(archiveFileSize);
		const formattedDuration = roundToPrecision(duration[0] + (duration[1] / 1000000000), 3);
		const formattedAverageMemoryUsed = bytesToMegabytes(averageMemoryUsed);

		usage.lookup(process.pid, function(err, result) {
			var averageCpuUsage = result.cpu;
			appendToResultsFile(fileCount + "\t\t" + compression + "\t\t" + formattedDuration + "\t\t" + formattedAverageMemoryUsed + "\t\t" + averageCpuUsage + "\t\t" + formattedArchiveFileSize);
			
			monitor.stop();
		});
	});
}

function addIndividualFiles(files, compression) {
	const fileCount = files.length;
	var totalFileSizeCount = 0;
	var totalMemoryUsage = 0;
	var startTime = process.hrtime();

	async.eachSeries(files, function(filePath, callback) {
		var size = fileSize(filePath);
		totalFileSizeCount += size;

		var task = "zip -q -" + compression + " " + archivePath + " " + filePath;
		cmd.exec(task, function(error, stdout, stderr) {
			console.log("Processing file...");
			const memory = process.memoryUsage();
			totalMemoryUsage += memory.heapUsed;
			
			console.log("Yield to the event loop for 100ms");
			setTimeout(callback(error), 100);
		});
	}, function(err, results) {
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
