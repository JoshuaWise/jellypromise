'use strict'
var Promise = require('./promise')
var TimeoutError = require('./timeout-error')
var console = require('./util').console // @[/browser]
var asArray = require('./util').asArray
var iterator = require('./util').iterator
var INTERNAL = require('./util').INTERNAL
var warn = require('./warn') // @[/development]
var LST = require('./long-stack-traces') // @[/development]

Promise.prototype.finally = function (fn) {
	if (typeof fn !== 'function') {
		// Will be bypassed, but produces a warning in development mode.
		return this._87(fn)
	}
	var self = this // @[/development]
	return this._87(function __c9d565ea_0267_11e6_8d22_5e5517507c66(value) {
		return Promise.resolve(fn())._87(function () {
			return value
		})
	}, function __c9d565ea_0267_11e6_8d22_5e5517507c66(reason) {
		return Promise.resolve(fn())._87(function () {
			LST.setRejectionStack(self._2()._32) // @[/development]
			throw reason
		})
	})
}
Promise.prototype.tap = function (fn) {
	if (typeof fn !== 'function') {
		// Will be bypassed, but produces a warning in development mode.
		return this._87(fn)
	}
	return this._87(function __c9d565ea_0267_11e6_8d22_5e5517507c66(value) {
		return Promise.resolve(fn(value))._87(function () {
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
	return this._87(null, function () {return value})
}
Promise.prototype.delay = function (ms) {
	return this._87(function (value) {
		return new Promise(function (res, rej) {
			setTimeout(function () {res(value)}, ~~ms)
		})
	})
}
Promise.prototype.timeout = function (ms, reason) {
	var self = this
	return new Promise(INTERNAL)._67(function (res, rej) {
		var timer = setTimeout(function () {
			rej(
				reason == null ? new TimeoutError('The operation timed out after ' + ~~ms + 'ms.')
			  : reason instanceof Error ? rej(reason) : new TimeoutError(String(reason))
			)
		}, ~~ms)
		var cancel = function () {clearTimeout(timer)}
		self._87(cancel, cancel)
		self._87(res, rej)
	})
}
Promise.prototype.log = function (prefix) {
	var usePrefix = arguments.length > 0
	return this._87(function (value) {
		usePrefix ? console.log(prefix, value) : console.log(value)
		return value
	})
}
Promise.prototype.inspect = function () {
	return new PromiseDescriptor(this)
}
Promise.any = function (iterable) {
	return new Promise(INTERNAL)._67(function __c9d565ea_0267_11e6_8d22_5e5517507c66(res, rej) {
		var input = asArray(iterable)
		var pendings = input.length
		var firstException = INTERNAL
		if (pendings === 0) {
			return rej(new Error('The iterable argument contained no items.'))
		}
		rej = LST.upgradeRejector(rej) // @[/development]
		var fail = function (reason) {
			if (firstException === INTERNAL) {firstException = reason}
			if (--pendings === 0) {rej(firstException)}
		}
		for (var i=0; i<pendings; i++) {
			Promise.resolve(input[i])._87(res, fail)
		}
	})
}
Promise.props = function (obj) {
	return new Promise(INTERNAL)._67(function __c9d565ea_0267_11e6_8d22_5e5517507c66(res, rej) {
		if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
			throw new TypeError('Expected argument to be an object.')
		}
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
			Promise.resolve(obj[key])._87(resolveItem(key), rej)
		}
	})
}
Promise.settle = function (iterable) {
	return new Promise(INTERNAL)._67(function (res, rej) {
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
			promise._87(handler, handler)
		}
	})
}
Promise.iterate = function (iterable, fn) {
	var promise = new Promise(INTERNAL)
	return promise._67(function __c9d565ea_0267_11e6_8d22_5e5517507c66(res, rej) {
		if (typeof fn !== 'function') {
			throw new TypeError('Expected second argument to be a function.')
		}
		if (iterator && iterable != null && typeof iterable[iterator] === 'function') {
			var it = iterable[iterator]()
		} else if (Array.isArray(iterable)) {
			var it = makeIterator(iterable)
		} else {
			throw new TypeError('Expected first argument to be an iterable object.')
		}
		rej = LST.upgradeRejector(rej) // @[/development]
		;(function next__c9d565ea_0267_11e6_8d22_5e5517507c66() {
			var item = it.next()
			if (item.done) {
				res()
			} else {
				var p = Promise.resolve(item.value)._87(fn)._87(next__c9d565ea_0267_11e6_8d22_5e5517507c66)
				p._32.parent = promise._32 // @[/development]
				p._87(null, rej)
			}
		}())
	})
}
Promise.isPromise = function (value) {
	return !!value
		&& (typeof value === 'object' || typeof value === 'function')
		&& typeof value.then === 'function'
}
Promise.TimeoutError = TimeoutError

function makeIterator(array) {
	var i = 0
	return {next: function () {
		return i < array.length
			? {done: false, value: array[i++]}
			: (i = NaN, {done: true, value: undefined})
	}}
}

var PromiseDescriptor = function Promise(promise) {
	promise = promise._2()
	if (promise._76 & 1) {
		this.state = 'fulfilled'
		this.value = promise._84
	} else if (promise._76 & 2) {
		this.state = 'rejected'
		this.reason = promise._84
	} else {
		this.state = 'pending'
	}
}