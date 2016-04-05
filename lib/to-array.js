'use strict'
var iterator = require('./iterator-symbol')

var toArray = module.exports = function (iterable) {
	if (typeof iterable.length === 'number') {
		return Array.prototype.slice.call(iterable)
	}
	if (iterator && typeof iterable[iterator] === 'function') {
		var arr = []
		for (var value of iterable) {arr.push(value)}
		return arr
	}
	throw new TypeError('Expected argument to be an iterable or array-like object.')
}
