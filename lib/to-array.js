'use strict'
var iterator = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol'
	? Symbol.iterator
	: undefined

module.exports = function (iterable) {
	if (typeof iterable.length === 'number') {
		return Array.prototype.slice.call(iterable)
	} else {
		var arr = []
		if (typeof iterable.forEach === 'function') {
			iterable.forEach(function (value) {arr.push(value)})
		} else if (iterator && typeof iterable[iterator] === 'function') {
			for (var value of iterable) {arr.push(value)}
		} else {
			throw TypeError('Expected argument to be an iterable or array-like object.')
		}
		return arr
	}
}
