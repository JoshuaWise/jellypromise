'use strict'
var iterator = exports.iterator = typeof Symbol === 'function' && Symbol.iterator || undefined

exports.INTERNAL = function () {}

// Returns an array or throws. The returned object may or may not be a safe
// copy. The only safe operations are to synchronously loop through the object.
// After control is given back to the caller, the object must not be used.
// The returned array COULD be a subclass of Array.
exports.asArray = function __c9d565ea_0267_11e6_8d22_5e5517507c66(iterable) {
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

// Returns whether the given catch predicate shoulf catch the exception reason.
exports.catchesError = function (predicate, reason) {
	if (predicate === Error || (predicate && predicate.prototype instanceof Error)) {
		return reason instanceof predicate
	}
	if (typeof predicate === 'function') {
		return !!predicate(reason)
	}
	if (predicate && typeof predicate === 'object') {
		var keys = Object.keys(predicate)
		for (var i=0, len=keys.length; i<len; i++) {
			var key = keys[i]
			if (reason[key] != predicate[key]) {
				return false
			}
		}
		if (len > 0) {
			return true
		}
	}
	warn('The predicate passed to .catch() is invalid, and will be ignored.') // @[/development]
	return false
}


// This must be at the bottom of the page so that warn.js doesn't load an
// uninitialized util.js.
var warn = require('./warn')