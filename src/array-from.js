'use strict'
var iterator = require('./iterator-symbol')
var slice = Array.prototype.slice

module.exports = function (iterable) {
	if (typeof iterable.length === 'number') {
		return slice.call(iterable)
	}
	if (iterator && typeof iterable[iterator] === 'function') {
		var arr = []
		var it = iterable[iterator]()
		var item
		while (!(item = it.next()).done) {
			arr.push(item.value)
		}
		return arr
	}
	throw new TypeError('Expected argument to be an iterable or array-like object.')
}
