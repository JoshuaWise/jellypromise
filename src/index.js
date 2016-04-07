'use strict'

// @[development node]
if (process.env.NODE_ENV === 'production') {
	module.exports = require('../production')
} else {
	module.exports = require('./core')
	require('./utilities')
	require('./node-extensions')
	require('./long-stack-traces')
}
// @[/]
// @[production node]
module.exports = require('./core')
require('./utilities')
require('./node-extensions')
// @[/]
// @[browser]
module.exports = require('./core')
require('./utilities')
require('./long-stack-traces') // @[/development]
// @[/]
