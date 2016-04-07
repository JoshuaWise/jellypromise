'use strict'

// @[development node]
if (process.env.NODE_ENV === 'production') {
	module.exports = require('./production')
} else {
	module.exports = require('./lib/core')
	require('./lib/utilities')
	require('./lib/node-extensions')
	require('./lib/long-stack-traces')
}
// @[/]
// @[production node]
module.exports = require('./lib/core')
require('./lib/utilities')
require('./lib/node-extensions')
// @[/]
// @[browser]
module.exports = require('./lib/core')
require('./lib/utilities')
require('./lib/long-stack-traces') // @[/development]
// @[/]
