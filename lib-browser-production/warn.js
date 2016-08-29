'use strict'
var console = require('./util').console // @[/browser]

module.exports = function (str) {
	var err = new Error(str)
	err.name = 'Warning'
	console.warn(err) // @[/browser]
}
