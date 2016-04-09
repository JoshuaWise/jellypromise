'use strict'
var iterator = exports.iterator = typeof Symbol === 'function' && Symbol.iterator || undefined

exports.INTERNAL = function () {}

// Returns an array or throws. The returned object may or may not be a safe
// copy. The only safe operations are to synchronously loop through the object.
// After control is given back to the caller, the object must not be used.
// The returned array COULD be a subclass of Array.
exports.asArray = function (iterable) {
	if (Array.isArray(iterable)) {
		return iterable
	}
	if (iterator && iterable != null && typeof iterable[iterator] === 'function') {
		var arr = []
		var it = iterable[iterator]()
		var item
		while (!(item = it.next()).done) {
			arr.push(item.value)
		}
		return arr
	}
	throw new TypeError('Expected argument to be an iterable object.')
}
