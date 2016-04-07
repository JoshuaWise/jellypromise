'use strict'
var basename = require('path').basename
var clc = require('cli-color')

if (typeof global.gc !== 'function') {
	console.error('To test for memory leaks, the "--expose-gc" CLI option must be set.')
	process.exit(1)
}

var tests = [
	'./basic'
]

;(function next() {
	if (!tests.length) {
		console.log(clc.green('All tests cleared!'))
		process.exit()
	}
	var testName = tests.shift()
	console.log(clc.cyan(basename(require.resolve(testName))))
	require(testName)(function (err) {
		if (err) {
			console.log(clc.red('FAIL:', err.message))
			process.exit(1)
		}
		next()
	})
}())
