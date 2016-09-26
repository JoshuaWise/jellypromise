'use strict'
var Promise = require('./promise')
var TimeoutError = require('./timeout-error')
var console = require('./util').console // @[/browser]
var asArray = require('./util').asArray
var iterator = require('./util').iterator
var INTERNAL = require('./util').INTERNAL

Promise.prototype.finally = function (fn) {
	if (typeof fn !== 'function') {
		// Will be bypassed, but produces a warning in development mode.
		return this._48(fn)
	}
	return this._48(function (value) {
		return Promise.resolve(fn())._48(function () {
			return value
		})
	}, function (reason) {
		return Promise.resolve(fn())._48(function () {
			throw reason
		})
	})
}
Promise.prototype.tap = function (fn) {
	if (typeof fn !== 'function') {
		// Will be bypassed, but produces a warning in development mode.
		return this._48(fn)
	}
	return this._48(function (value) {
		return Promise.resolve(fn(value))._48(function () {
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
	return this._48(null, function () {return value})
}
Promise.prototype.delay = function (ms) {
	return this._48(function (value) {
		return new Promise(function (res, rej) {
			setTimeout(function () {res(value)}, ~~ms)
		})
	})
}
Promise.prototype.timeout = function (ms, reason) {
	var self = this
	return new Promise(INTERNAL)._4(function (res, rej) {
		var timer = setTimeout(function () {
			rej(
				reason == null ? new TimeoutError('The operation timed out after ' + (~~ms > 0 ? ~~ms : 0) + 'ms.')
			  : reason instanceof Error ? rej(reason) : new TimeoutError(String(reason))
			)
		}, ~~ms)
		var cancel = function () {clearTimeout(timer)}
		self._48(cancel, cancel)
		self._48(res, rej)
	})
}
Promise.prototype.log = function (prefix) {
	var usePrefix = arguments.length > 0
	return this._48(function (value) {
		usePrefix ? console.log(prefix, value) : console.log(value)
		return value
	})
}
Promise.prototype.inspect = function () {
	return new PromiseDescriptor(this)
}
Promise.any = function (iterable) {
	return new Promise(INTERNAL)._4(function (res, rej) {
		var input = asArray(iterable)
		var pendings = input.length
		var firstException = INTERNAL
		if (pendings === 0) {
			return rej(new Error('The iterable argument contained no items.'))
		}
		var fail = function (reason) {
			if (firstException === INTERNAL) {firstException = reason}
			if (--pendings === 0) {rej(firstException)}
		}
		for (var i=0; i<pendings; i++) {
			Promise.resolve(input[i])._48(res, fail)
		}
	})
}
Promise.props = function (obj) {
	return new Promise(INTERNAL)._4(function (res, rej) {
		if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
			throw new TypeError('Expected argument to be an object.')
		}
		var keys = Object.keys(obj)
		var pendings = keys.length
		var result = {}
		if (pendings === 0) {
			return res(result)
		}
		var resolveItem = function (key) {
			return function (value) {
				result[key] = value
				if (--pendings === 0) {res(result)}
			}
		}
		for (var i=0; i<pendings; i++) {
			var key = keys[i]
			Promise.resolve(obj[key])._48(resolveItem(key), rej)
		}
	})
}
Promise.settle = function (iterable) {
	return new Promise(INTERNAL)._4(function (res, rej) {
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
			promise._48(handler, handler)
		}
	})
}
Promise.iterate = function (iterable, fn) {
	var promise = new Promise(INTERNAL)
	return promise._4(function (res, rej) {
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
		;(function next() {
			var item = it.next()
			if (item.done) {
				res()
			} else {
				var p = Promise.resolve(item.value)._48(fn)._48(next)
				p._48(null, rej)
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
	promise = promise._96()
	if (promise._76 & 1) {
		this.state = 'fulfilled'
		this.value = promise._92
	} else if (promise._76 & 2) {
		this.state = 'rejected'
		this.reason = promise._92
	} else {
		this.state = 'pending'
	}
}
