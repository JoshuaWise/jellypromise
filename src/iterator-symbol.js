'use strict'
module.exports = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol'
	? Symbol.iterator
	: undefined
