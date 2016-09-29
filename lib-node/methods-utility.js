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
		return this._67(fn)
	}
	var self = this // @[/development]
	return this._67(function (value) {
		return Promise.resolve(fn())._67(function () {
			return value
		})
	}, function (reason) {
		return Promise.resolve(fn())._67(function () {
			LST.setRejectionStack(self._73()._49) // @[/development]
			throw reason
		})
	})
}
Promise.prototype.tap = function (fn) {
	if (typeof fn !== 'function') {
		// Will be bypassed, but produces a warning in development mode.
		return this._67(fn)
	}
	return this._67(function (value) {
		return Promise.resolve(fn(value))._67(function () {
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
	return this._67(null, function () {return value})
}
Promise.prototype.delay = function (ms) {
	return this._67(function (value) {
		return new Promise(function (res, rej) {
			setTimeout(function () {res(value)}, ~~ms)
		})
	})
}
Promise.prototype.timeout = function (ms, reason) {
	var self = this
	return new Promise(INTERNAL)._23(function (res, rej) {
		var timer = setTimeout(function () {
			rej(
				reason == null ? new TimeoutError('The operation timed out after ' + (~~ms > 0 ? ~~ms : 0) + 'ms.')
			  : reason instanceof Error ? reason : new TimeoutError(String(reason))
			)
		}, ~~ms)
		var cancel = function () {clearTimeout(timer)}
		self._67(cancel, cancel)
		self._67(res, rej)
	})
}
Promise.prototype.log = function (prefix) {
	var usePrefix = arguments.length > 0
	return this._67(function (value) {
		usePrefix ? console.log(prefix, value) : console.log(value)
		return value
	})
}
Promise.prototype.inspect = function () {
	return new PromiseDescriptor(this)
}
Promise.any = function (iterable) {
	return new Promise(INTERNAL)._23(function (res, rej) {
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
			Promise.resolve(input[i])._67(res, fail)
		}
	})
}
Promise.props = function (obj) {
	return new Promise(INTERNAL)._23(function (res, rej) {
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
			Promise.resolve(obj[key])._67(resolveItem(key), rej)
		}
	})
}
Promise.settle = function (iterable) {
	return new Promise(INTERNAL)._23(function (res, rej) {
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
			promise._67(handler, handler)
		}
	})
}
Promise.isPromise = function (value) {
	return !!value
		&& (typeof value === 'object' || typeof value === 'function')
		&& typeof value.then === 'function'
}
Promise.TimeoutError = TimeoutError

var PromiseDescriptor = function Promise(promise) {
	promise = promise._73()
	if (promise._56 & 1) {
		this.state = 'fulfilled'
		this.value = promise._60
	} else if (promise._56 & 2) {
		this.state = 'rejected'
		this.reason = promise._60
	} else {
		this.state = 'pending'
	}
}
