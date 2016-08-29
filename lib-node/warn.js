'use strict'
var clc = require('cli-color') // @[/node]

module.exports = function (str) {
	if (require('./promise').suppressWarnings) {
		var originalWarn = console.warn
		console.warn = function () {console.warn = originalWarn}
	}
	var err = new Error(str)
	err.name = 'Warning'
	console.warn(clc.yellow(String(err.stack || err))) // @[/node]
}
