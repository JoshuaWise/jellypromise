'use strict'
var console = require('./util').console // @[/browser]

module.exports = function (str) {
	if (require('./promise').suppressWarnings) {
		var originalWarn = console.warn
		console.warn = function () {console.warn = originalWarn}
	}
	var err = new Error(str)
	err.name = 'Warning'
	console.warn(err) // @[/browser]
}
