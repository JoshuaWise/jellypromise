'use strict'
var iterator = require('./iterator-symbol')

module.exports = function (iterable) {
	if (typeof iterable.length === 'number') {
		return Array.prototype.slice.call(iterable)
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
