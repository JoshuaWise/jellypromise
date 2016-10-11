'use strict'
var Promise = require('./promise')
var console = require('./util').console // @[/browser]
var iterate = require('./util').iterate
var INTERNAL = require('./util').INTERNAL
var LST = require('./long-stack-traces') // @[/development]

Promise.prototype.finally = function (fn) {
	if (typeof fn !== 'function') {
		// Will be bypassed, but produces a warning in development mode.
		return this._then(fn)
	}
	var self = this // @[/development]
	return this._then(function (value) {
		return Promise.resolve(fn())._then(function () {
			return value
		})
	}, function (reason) {
		return Promise.resolve(fn())._then(function () {
			LST.setRejectionStack(self._getFollowee()._trace) // @[/development]
			throw reason
		})
	})
}
Promise.prototype.tap = function (fn) {
	if (typeof fn !== 'function') {
		// Will be bypassed, but produces a warning in development mode.
		return this._then(fn)
	}
	return this._then(function (value) {
		return Promise.resolve(fn(value))._then(function () {
			return value
		})
	})
}
Promise.prototype.become = function (fulfilledValue, rejectedValue) {
	return this._then(
		function () {return fulfilledValue},
		arguments.length > 1 ? function () {return rejectedValue} : undefined
	)
}
Promise.prototype.else = function (value, valueWhenTheresAPredicate) {
	return arguments.length > 1
		? this._conditionalCatch(value, function () {return valueWhenTheresAPredicate})
		: this._then(undefined, function () {return value})
}
Promise.prototype.delay = function (ms) {
	return this._then(function (value) {
		return new Promise(function (res, rej) {
			setTimeout(function () {res(value)}, ~~ms)
		})
	})
}
Promise.prototype.timeout = function (ms, reason) {
	var promise = new Promise(INTERNAL)
	var cancel = function () {clearTimeout(timer)}
	this._handleNew(cancel, cancel, undefined, $NO_INTEGER)
	this._handleNew(undefined, undefined, promise, $NO_INTEGER)
	
	var timer = setTimeout(function () {
		promise._reject(
			reason == null ? new TimeoutError('The operation timed out after ' + (~~ms > 0 ? ~~ms : 0) + 'ms.')
		  : reason instanceof Error ? reason : new TimeoutError(String(reason))
		)
	}, ~~ms)
	
	return promise
}
Promise.prototype.log = function (prefix) {
	var usePrefix = arguments.length > 0
	return this._then(function (value) {
		usePrefix ? console.log(prefix, value) : console.log(value)
		return value
	})
}
Promise.prototype.inspect = function () {
	return new PromiseDescriptor(this)
}
Promise.any = function (iterable) {
	return new Promise(function (res, rej) {
		var firstException = INTERNAL
		var pendings = 0
		var fail = function (reason) {
			if (firstException === INTERNAL) {firstException = reason}
			if (--pendings === 0) {rej(firstException)}
		}
		iterate(iterable, function (value) {
			++pendings
			Promise.resolve(value)._handleNew(res, fail, undefined, $NO_INTEGER)
		})
		pendings || rej(new RangeError('The iterable argument contained no items.'))
	})
}
Promise.props = function (obj) {
	return new Promise(function (res, rej) {
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
			Promise.resolve(obj[key])._handleNew(resolveItem(key), rej, undefined, $NO_INTEGER)
		}
	})
}
Promise.settle = function (iterable) {
	return new Promise(function (res) {
		var pendings = 0
		var result = []
		var resolveItem = function (promise, i) {
			return function () {
				result[i] = new PromiseDescriptor(promise)
				if (--pendings === 0) {res(result)}
			}
		}
		iterate(iterable, function (value) {
			var promise = Promise.resolve(value)
			var handler = resolveItem(promise, pendings++)
			promise._handleNew(handler, handler, undefined, $NO_INTEGER)
		})
		pendings ? (result.length = pendings) : res(result)
	})
}
Promise.isPromise = function (value) {
	return !!value
		&& (typeof value === 'object' || typeof value === 'function')
		&& typeof value.then === 'function'
}
Promise.TimeoutError = TimeoutError


var PromiseDescriptor = function Promise(promise) {
	promise = promise._getFollowee()
	if (promise._state & $IS_FULFILLED) {
		this.state = 'fulfilled'
		this.value = promise._value
	} else if (promise._state & $IS_REJECTED) {
		this.state = 'rejected'
		this.reason = promise._value
	} else {
		this.state = 'pending'
	}
}


function TimeoutError(message) {
	Error.call(this)
	this.message = message
	if (typeof Error.captureStackTrace === 'function') {
		Error.captureStackTrace(this, TimeoutError)
	}
}
TimeoutError.prototype.__proto__ = Error.prototype
TimeoutError.prototype.name = 'TimeoutError'

