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
	var err = new Error(str)
	err.name = 'Warning'
	console.warn(clc.yellow(String(err.stack || err))) // @[/node]
	console.warn(err) // @[/browser]
}
