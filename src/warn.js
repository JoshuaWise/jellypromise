'use strict'
var clc = require('cli-color') // @[/node]
var console = require('./util').console // @[/browser]

module.exports = function (str) {
	var err = new Error(str)
	err.name = 'Warning'
	console.warn(clc.yellow(err.stack || String(err))) // @[/node]
	console.warn(err.stack || String(err)) // @[/browser]
}
