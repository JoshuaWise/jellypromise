'use strict'

// @[development node]
if (process.env.NODE_ENV === 'production') {
	module.exports = require('../production')
} else {
	module.exports = require('./promise')
	require('./methods-utility')
	require('./methods-aggregate')
	require('./methods-node')
	require('./methods-private')
}
// @[/]
// @[production node]
module.exports = require('./promise')
require('./methods-utility')
require('./methods-aggregate')
require('./methods-node')
require('./methods-private')
// @[/]
// @[browser]
module.exports = require('./promise')
require('./methods-utility')
require('./methods-aggregate')
require('./methods-private')
// @[/]
