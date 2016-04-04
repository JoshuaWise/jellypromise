'use strict'
var iterator = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol'
	? Symbol.iterator
	: undefined

var iterate = module.exports = function (iterable, fn) {
	if (typeof iterable.forEach === 'function') {
		iterable.forEach(fn)
	} else if (iterator && typeof iterable[iterator] === 'function') {
		for (var value of iterable) {
			fn(value)
		}
	} else if (typeof iterable.length === 'number') {
		for (var i=0, len=iterable.length; i<len; i++) {
			fn(iterable[i])
		}
	} else {
		throw TypeError('Expected argument to be an iterable or array-like object.')
	}
}

iterate.toArray = function (iterable) {
    if (typeof iterable.length === 'number') {
        return Array.prototype.slice.call(iterable)
    }
    var arr = []
    iterate(iterable, function (value) {arr.push(value)})
    return arr
}
