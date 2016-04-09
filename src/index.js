'use strict'

// @[development node]
if (process.env.NODE_ENV === 'production') {
	module.exports = require('../production')
} else {
	module.exports = require('./promise')
	require('./methods-private')
	require('./methods-utility')
	// require('./methods-aggregate')
	require('./methods-node')
	require('./long-stack-traces')
}
// @[/]
// @[production node]
module.exports = require('./promise')
require('./methods-private')
require('./methods-utility')
// require('./methods-aggregate')
require('./methods-node')
// @[/]
// @[browser]
module.exports = require('./promise')
require('./methods-private')
require('./methods-utility')
// require('./methods-aggregate')
require('./long-stack-traces') // @[/development]
// @[/]
