'use strict'
var clc = require('cli-color') // @[/node]
var console = require('./util').console // @[/browser]

module.exports = function (str) {
	// @[development]
	if (require('./promise').suppressWarnings) {
		var originalWarn = console.warn
		console.warn = function () {console.warn = originalWarn}
	}
	// @[/]
	var warning = new Warning(str)
	console.warn(clc.yellow(String(warning.stack || warning))) // @[/node]
	console.warn(warning) // @[/browser]
}

function Warning(message) {
	Error.call(this)
	this.message = message
	if (typeof Error.captureStackTrace === 'function') {
		Error.captureStackTrace(this, Warning)
	}
}
Warning.prototype.__proto__ = Error.prototype
Warning.prototype.name = 'Warning'
