'use strict'

// @[development node]
if (process.env.NODE_ENV === 'production') {
	module.exports = require('../production')
} else {
	module.exports = require('./promise')
	require('./utilities')
	// require('./aggregate-methods')
	require('./node-extensions')
	require('./long-stack-traces')
}
// @[/]
// @[production node]
module.exports = require('./promise')
require('./utilities')
// require('./aggregate-methods')
require('./node-extensions')
// @[/]
// @[browser]
module.exports = require('./promise')
require('./utilities')
// require('./aggregate-methods')
require('./long-stack-traces') // @[/development]
// @[/]
