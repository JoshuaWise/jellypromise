'use strict'
var gulp = require('gulp')
var Promise = require('bluebird')
var fs = require('fs-extra-promise')
var glob = require('./tools/glob')
var obfuscatePrivateMembers = require('./tools/obfuscate-private-members')
var replaceConstants = require('./tools/replace-constants')
var processDirectives = require('./tools/process-directives')

gulp.task('default', ['node', 'browser', 'node-production', 'browser-production']);

gulp.task('node', function () {
	var directives = ['node', 'development']
	return copySrc('lib-node')
		.bind(directives)
		.then(processFiles)
		.then(done)
});

gulp.task('browser', function () {
	var directives = ['browser', 'development']
	return copySrc('lib-browser')
		.bind(directives)
		.then(processFiles)
		.then(done)
});

gulp.task('node-production', function () {
	var directives = ['node', 'production']
	return copySrc('lib-node-production')
		.bind(directives)
		.then(processFiles)
		.then(function () {
			return fs.writeFileAsync('production.js',
				"'use strict'\nmodule.exports = require('./lib-node-production/index.js')\n")
		})
		.then(done)
});

gulp.task('browser-production', function () {
	var directives = ['browser', 'production']
	return copySrc('lib-browser-production')
		.bind(directives)
		.then(processFiles)
		.then(done)
});

gulp.task('clear', function () {
	return Promise.all([
		fs.removeAsync('lib-node'),
		fs.removeAsync('lib-browser'),
		fs.removeAsync('lib-node-production'),
		fs.removeAsync('lib-browser-production'),
		fs.removeAsync('production.js')
	])
});

function copySrc(lib) {
	return fs.copyAsync('src', lib, {clobber: true, filter: filterDotFiles})
		.then(function () {console.log('Building to', lib + '/**')})
		.then(glob(lib + '/**/*.js'))
}

function processFiles(filenames) {
	var directives = this
	return Promise.resolve(filenames)
		.map(readFile)
		.map(obfuscatePrivateMembers())
		.map(replaceConstants(directives))
		.map(processDirectives(directives, filenames))
		.map(function (data, i) {return fs.writeFileAsync(filenames[i], data)})
}

function readFile(filename) {
	return fs.readFileAsync(filename).then(String)
}
function filterDotFiles(filename) {
	return !/(\\|\/|^)\./.test(filename)
}
function done() {
	console.log('Done!')
}
