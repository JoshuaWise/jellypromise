'use strict'
if (process.env.NODE_ENV === 'production') { // @[development]
	module.exports = require('./production') // @[development]
} else { // @[development]
	module.exports = require('./lib/core')
	require('./lib/node-extensions')
	require('./lib/utilities')
	require('./lib/long-stack-traces') // @[development]
} // @[development]
