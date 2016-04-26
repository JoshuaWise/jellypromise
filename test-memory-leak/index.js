'use strict'
var basename = require('path').basename
var clc = require('cli-color')
var PromiseDev = require('../.')
var Promise = require('../production')

if (typeof global.gc !== 'function') {
	console.error('To test for memory leaks, the "--expose-gc" CLI option must be set.')
	process.exit(1)
}

var tests = [
	'./basic'
]

console.log(clc.magenta('--- Memory leak tests ---'))
;(function next() {
	if (!tests.length) {
		console.log(clc.green('All tests cleared!'))
		process.exit()
	}
	
	var testName = tests.shift()
	var testFunction = require(testName)
	var commonName = basename(require.resolve(testName))
	
	console.log(clc.cyan(commonName))
	testFunction(PromiseDev, function (err) {
		fail(err)
		console.log(clc.cyan(commonName + ' (production)'))
		testFunction(Promise, function (err) {
			fail(err)
			next()
		})
	})
}())

function fail(err) {
	if (err) {
		console.log(clc.red('FAIL:', err.message))
		process.exit(1)
	}
}
