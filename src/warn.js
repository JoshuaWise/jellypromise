'use strict'
var clc = require('cli-color') // @[/node]
var console = require('./util').console // @[/browser]

// @[node]
if (process.env.IS_TEST_ENVIRONMENT === 'yup') {
	var console = {warn: function () {}}
}
// @[/]
module.exports = function (str) {
	var err = new Error(str)
	err.name = 'Warning'
	console.warn(clc.yellow(String(err.stack || err))) // @[/node]
	console.warn(err) // @[/browser]
}
