'use strict'
var iterator = exports.iterator = typeof Symbol === 'function' && Symbol.iterator || undefined

exports.INTERNAL = function () {}
exports.PASSTHROUGH_REJECTION = false // @[/development]

// Invokes the given function for each item in the given iterable object.
// An exceptions may be thrown if iteration fails.
exports.iterate = function (iterable, fn) {
	if (Array.isArray(iterable)) {
		for (var i=0, len=iterable.length; i<len; ++i) {
			fn(iterable[i])
		}
	} else if (iterator && iterable != null && typeof iterable[iterator] === 'function') {
		var it = iterable[iterator]()
		for (var next=it.next(); !next.done; next=it.next()) {
			fn(next.value)
		}
	} else {
		throw new TypeError('Expected value to be an iterable object.')
	}
}

// @[browser]
// Safe, cross-browser log functions.
exports.console = {
	log: function () {
		if (typeof console === 'object' && console) {
			Function.prototype.apply.call(console.log, console, arguments)
		}
	},
	// @[development]
	warn: function () {
		if (typeof console === 'object' && console) {
			Function.prototype.apply.call(console.warn, console, arguments)
		}
	},
	// @[/]
	error: function () {
		if (typeof console === 'object' && console) {
			Function.prototype.apply.call(console.error, console, arguments)
		}
	}
}
// @[/]
