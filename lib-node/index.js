'use strict'

if (process.env.NODE_ENV === 'production') {
	module.exports = require('../production')
} else {
	module.exports = require('./core')
	require('./utilities')
	require('./node-extensions')
	require('./long-stack-traces')
}
