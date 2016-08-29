'use strict'
var clc = require('cli-color') // @[/node]

module.exports = function (str) {
	var err = new Error(str)
	err.name = 'Warning'
	console.warn(clc.yellow(String(err.stack || err))) // @[/node]
}
