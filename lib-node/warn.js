'use strict'
var clc = require('cli-color') // @[/node]

module.exports = function (str, stack) {
	if (require('./promise').suppressWarnings) {
		var originalWarn = console.warn
		console.warn = function () {console.warn = originalWarn}
	}
	console.warn(
		clc.yellow( // @[/node]
			'Warning: ' + String(str) + '\n' + stack.getTrace()
		) // @[/node]
	)
}
