'use strict'
var console = require('./util').console // @[/browser]

module.exports = function (str, stack) {
	if (require('./promise').suppressWarnings) {
		var originalWarn = console.warn
		console.warn = function () {console.warn = originalWarn}
	}
	console.warn(
			'Warning: ' + String(str) + '\n' + stack.getTrace()
	)
}
