'use strict'
var Promise = require('./promise')
var TimeoutError = require('./timeout-error')
var asArray = require('./util').asArray
var iterator = require('./util').iterator
var INTERNAL = require('./util').INTERNAL
var warn = require('./warn') // @[/development]
var LST = require('./long-stack-traces') // @[/development]

Promise.prototype.finally = function (fn) {
	if (typeof fn !== 'function') {
		// Will be bypassed, but produces a warning in development mode.
		return this._3(fn)
	}
	var self = this // @[/development]
	return this._3(function __c9d565ea_0267_11e6_8d22_5e5517507c66(value) {
		return Promise.resolve(fn())._3(function () {
			return value
		})
	}, function __c9d565ea_0267_11e6_8d22_5e5517507c66(reason) {
		return Promise.resolve(fn())._3(function () {
			LST.setRejectionStack(self._1()._71) // @[/development]
			throw reason
		})
	})
}
Promise.prototype.tap = function (fn) {
	if (typeof fn !== 'function') {
		// Will be bypassed, but produces a warning in development mode.
		return this._3(fn)
	}
	return this._3(function __c9d565ea_0267_11e6_8d22_5e5517507c66(value) {
		return Promise.resolve(fn())._3(function () {
			return value
		})
	})
}
Promise.prototype.else = function (value) {
	if (arguments.length > 1) {
		var len = arguments.length - 1
		var args = new Array(len + 1)
		for (var i=0; i<len; i++) {
			args[i] = arguments[i]
		}
		value = arguments[i]
		args[i] = function () {return value}
		return this.catch.apply(this, args)
	}
	return this._3(null, function () {return value})
}
Promise.prototype.delay = function (ms) {
	return this._3(function (value) {
		return new Promise(function (res, rej) {
			setTimeout(function () {res(value)}, ~~ms)
		})
	})
}
Promise.prototype.timeout = function (ms, reason) {
	var self = this
	return new Promise(INTERNAL)._50(function (res, rej) {
		var timer = setTimeout(function () {
			rej(
				reason == null ? new TimeoutError('The operation timed out after ' + ~~ms + 'ms.')
			  : reason instanceof Error ? rej(reason) : new TimeoutError(String(reason))
			)
		}, ~~ms)
		var cancel = function () {clearTimeout(timer)}
		self._3(cancel, cancel)
		self._3(res, rej)
	})
}
Promise.prototype.log = function (prefix) {
	var usePrefix = arguments.length > 0
	return this._3(function (value) {
		usePrefix ? console.log(prefix, value) : console.log(value)
		return value
	})
}
Promise.prototype.inspect = function () {
	return new PromiseDescriptor(this)
}
Promise.any = function (iterable) {
	return new Promise(INTERNAL)._50(function __c9d565ea_0267_11e6_8d22_5e5517507c66(res, rej) {
		var input = asArray(iterable)
		var pendings = input.length
		if (pendings === 0) {
			return rej(new Error('The iterable argument contained no items.'))
		}
		rej = LST.upgradeRejector(rej) // @[/development]
		var fail = function (reason) {
			if (--pendings === 0) {rej(reason)}
		}
		for (var i=0; i<pendings; i++) {
			Promise.resolve(input[i])._3(res, fail)
		}
	})
}
Promise.props = function (obj) {
	return new Promise(INTERNAL)._50(function __c9d565ea_0267_11e6_8d22_5e5517507c66(res, rej) {
		var keys = Object.keys(obj)
		var pendings = keys.length
		var result = {}
		if (pendings === 0) {
			return res(result)
		}
		rej = LST.upgradeRejector(rej) // @[/development]
		var resolveItem = function (key) {
			return function (value) {
				result[key] = value
				if (--pendings === 0) {res(result)}
			}
		}
		for (var i=0; i<pendings; i++) {
			var key = keys[i]
			Promise.resolve(obj[key])._3(resolveItem(key), rej)
		}
	})
}
Promise.settle = function (iterable) {
	return new Promise(INTERNAL)._50(function (res, rej) {
		var input = asArray(iterable)
		var pendings = input.length
		var result = new Array(pendings)
		if (pendings === 0) {
			return res(result)
		}
		var resolveItem = function (promise, i) {
			return function (value) {
				result[i] = new PromiseDescriptor(promise)
				if (--pendings === 0) {res(result)}
			}
		}
		for (var i=0; i<pendings; i++) {
			var promise = Promise.resolve(input[i])
			var handler = resolveItem(promise, i)
			promise._3(handler, handler)
		}
	})
}
Promise.iterate = function (iterable, fn) {
	return new Promise(INTERNAL)._50(function __c9d565ea_0267_11e6_8d22_5e5517507c66(res, rej) {
		if (typeof fn !== 'function' && fn != null) {
			warn('Handlers must be functions (' + typeof fn + 's will be ignored).')
		}
		if (iterator && iterable != null && typeof iterable[iterator] === 'function') {
			var it = iterable[iterator]()
		} else if (Array.isArray(iterable)) {
			var it = makeIterator(iterable)
		} else {
			throw new TypeError('Expected first argument to be an iterable object.')
		}
		rej = LST.upgradeRejector(rej) // @[/development]
		var next = function __c9d565ea_0267_11e6_8d22_5e5517507c66() {
			var item = it.next()
			item.done
				? res()
				: Promise.resolve(item.value)._3(handler)._3(null, rej)
		}
		var handler = typeof fn === 'function'
			? function __c9d565ea_0267_11e6_8d22_5e5517507c66(value) {return Promise.resolve(fn(value))._3(next)}
			: next
		next()
	})
}
Promise.isPromise = function (value) {
	return value
		&& (typeof value === 'object' || typeof value === 'function')
		&& typeof value.then === 'function'
}
Promise.TimeoutError = TimeoutError

function makeIterator(array) {
	var i = 0
	return {next: function () {
		return i < array.length
			? {done: false, value: array[i++]}
			: {done: true}
	}}
}

var PromiseDescriptor = function Promise(promise) {
	promise = promise._1()
	if (promise._96 & 1) {
		this.state = 'fulfilled'
		this.value = promise._31
	} else if (promise._96 & 2) {
		this.state = 'rejected'
		this.reason = promise._31
	} else {
		this.state = 'pending'
	}
}
