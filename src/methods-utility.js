'use strict'
var Promise = require('./promise')
var console = require('./util').console // @[/browser]
var iterate = require('./util').iterate
var INTERNAL = require('./util').INTERNAL
var hasOwnProperty = Object.prototype.hasOwnProperty

Promise.prototype.finally = function (fn) {
	if (typeof fn !== 'function') {
		// Will be bypassed, but produces a warning in development mode.
		return this._then(fn)
	}
	var handler = function () {
		var ret = fn()
		return isPromise(ret)
			? (promise = Promise.resolve(ret)._then(originalState))
			: originalState()
	}
	var originalState = function () {
		var originalPromise = self._getFollowee()
		if (originalPromise._state & $IS_FULFILLED) {
			return originalPromise._value
		}
		promise._reject(originalPromise._value) // @[/production]
		promise._passthroughReject(originalPromise._value, originalPromise._trace) // @[/development]
	}
	var self = this
	var promise = this._then(handler, handler)
	return promise
}
Promise.prototype.tap = function (fn) {
	if (typeof fn !== 'function') {
		// Will be bypassed, but produces a warning in development mode.
		return this._then(fn)
	}
	return this._then(function (value) {
		var ret = fn(value)
		return isPromise(ret)
			? Promise.resolve(ret)._then(function () {return value})
			: value
	})
}
Promise.prototype.rollback = function (fn) {
	if (typeof fn !== 'function') {
		// Will be bypassed, but produces a warning in development mode.
		return this._then(fn)
	}
	var handler = function (reason) {
		var ret = fn(reason)
		return isPromise(ret)
			? (promise = Promise.resolve(ret)._then(originalState))
			: originalState()
	}
	var originalState = function () {
		var originalPromise = self._getFollowee()
		promise._reject(originalPromise._value) // @[/production]
		promise._passthroughReject(originalPromise._value, originalPromise._trace) // @[/development]
	}
	var self = this
	var promise = this._then(undefined, handler)
	return promise
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
		return PromiseAfter(ms, value)
	})
}
Promise.prototype.timeout = function (ms, reason) {
	var cancel = function () {clearTimeout(timer)}
	this._handleNew(cancel, cancel, undefined, $NO_INTEGER)
	var promise = this._then()

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
		var resolveItem = function (key) {
			return function (value) {
				result[key] = value
				if (--pendings === 0) {res(result)}
			}
		}
		for (var i=0, len=pendings; i<len; ++i) {
			var key = keys[i]
			var value = obj[key]
			isPromise(value)
				? Promise.resolve(value)._handleNew(resolveItem(key), rej, undefined, $NO_INTEGER)
				: (--pendings, result[key] = value)
		}
		pendings || res(result)
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
Promise.build = function (keys, handler) {
	if (!Array.isArray(keys)) {throw new TypeError('Expected first argument to be an array.')}
	if (typeof handler !== 'function') {throw new TypeError('Expected second argument to be a function.')}
	keys = keys.slice()
	var promise
	return promise = new Promise(function (res, rej) {
		var pendings = keys.length
		var result = {}
		var builder = function (key, value) {
			if (promise._state & $IS_RESOLVED) {
				return false
			}
			if (key !== null && typeof key === 'object') {
				var props = Object.keys(key)
				var oneSucceeded = false
				for (var i=0, len=props.length; i<len; ++i) {
					var prop = props[i]
					if (setValue(prop, key[prop])) {
						oneSucceeded = true
					}
				}
				return oneSucceeded
			}
			return setValue(key, value)
		}
		var setValue = function (key, value) {
			if (keys.indexOf(key) === -1) {
				return false
			}
			if (!hasOwnProperty.call(result, key)) {
				if (--pendings === 0) {res(result)}
			}
			result[key] = value
			return true
		}
		handler(builder, rej)
		pendings || res(result)
	})
}
var PromiseAfter = Promise.after = function (ms, value) {
	value instanceof Promise && value.catchLater()
	var promise = new Promise(INTERNAL)
	setTimeout(function () {promise._resolve(value)}, ~~ms)
	return promise
}
var isPromise = Promise.isPromise = function (value) {
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

