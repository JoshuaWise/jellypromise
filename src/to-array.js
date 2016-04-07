'use strict'
module.exports = require('./iterator-symbol')
	? require('./to-array-modern')
	: function (iterable) {
		if (typeof iterable.length === 'number') {
			return Array.prototype.slice.call(iterable)
		}
		throw new TypeError('Expected argument to be an iterable or array-like object.')
	}
