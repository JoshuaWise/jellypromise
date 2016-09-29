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

// Returns whether the given catch predicate should catch the exception reason.
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
	return false
}

// A safe, cross-browser log function.
exports.console = {
	log: function () {
		if (typeof console === 'object' && console) {
			Function.prototype.apply.call(console.log, console, arguments)
		}
	},
	error: function () {
		if (typeof console === 'object' && console) {
			Function.prototype.apply.call(console.error, console, arguments)
		}
	}
}
