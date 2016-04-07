'use strict'
var productionModulePath = './production'

if (process.env.NODE_ENV === 'production') { // @[development]
	module.exports = require(productionModulePath) // @[development]
} else { // @[development]
	module.exports = require('./lib/core')
	require('./lib/utilities')
	require('./lib/node-extensions')
	require('./lib/long-stack-traces') // @[development]
} // @[development]
