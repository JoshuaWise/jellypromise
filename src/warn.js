'use strict'
var clc = require('cli-color') // @[/development node]

module.exports = function (str) {
	var err = new Error(str)
	err.name = 'Warning'
	console.warn(clc.yellow(err.stack || (err.name + ': ' + err.message))) // @[/development node]
	console.warn(err.stack || (err.name + ': ' + err.message)) // @[/production node]
	console.warn(err.stack || (err.name + ': ' + err.message)) // @[/browser]
}
