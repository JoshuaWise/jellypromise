'use strict'
var Promise = require('./promise')
var task = require('./task')
var clc = require('cli-color') // @[/node]
var console = require('./util').console // @[/browser]
var INTERNAL = require('./util').INTERNAL
var warn = require('./warn') // @[/development]
var LST = require('./long-stack-traces') // @[/development]
var PASSTHROUGH_REJECTION = false // @[/development]

// This is the .then() method used by all internal functions.
// It optionally allows a third parameter which must either be an integer or
// undefined. If provided, it will be passed as the second argument to the
// handler (onFulfilled or onRejected).
Promise.prototype._then = function (onFulfilled, onRejected, smuggledInteger) {
	var promise = new Promise(INTERNAL)
	this._handleNew(onFulfilled, onRejected, promise, smuggledInteger === undefined ? $NO_INTEGER : smuggledInteger)
	return promise
}

// This is used by the Promise constructor to invoke the handler that was
// provided to it.
Promise.prototype._resolveFromHandler = function (handler) {
	var ret = tryCallTwo(handler, this._resolver(), this._rejector())
	if (ret === IS_ERROR) {
		this._reject(LAST_ERROR)
	}
}

// An abstraction for .catch() and .else().
Promise.prototype._conditionalCatch = function (predicate, onRejected) {
	var self = this // @[/development]
	var newPromise
	return newPromise = this._then(undefined, function (reason) {
		if (Array.isArray(predicate)) {
			for (var i=0, len=predicate.length; i<len; ++i) {
				if (catchesError(predicate[i], reason)) {return onRejected(reason)} // @[/production]
				if (catchesError(predicate[i], reason, newPromise)) {return onRejected(reason)} // @[/development]
			}
		} else {
			if (catchesError(predicate, reason)) {return onRejected(reason)} // @[/production]
			if (catchesError(predicate, reason, newPromise)) {return onRejected(reason)} // @[/development]
		}
		newPromise._reject(reason) // @[/production]
		newPromise._passthroughReject(reason, self._getFollowee()._trace) // @[/development]
	})
}

Promise.prototype._resolver = function () {
	var self = this
	return function (value) {self._resolve(value)}
}
Promise.prototype._rejector = function () {
	var self = this
	return function (reason) {self._reject(reason)}
}

Promise.prototype._resolve = function (newValue) {
	if (this._state & $IS_RESOLVED) {
		return
	}
	if (newValue === this) {
		return this._reject(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._reject(LAST_ERROR)
		}
		if (typeof then === 'function') {
			return this._follow(newValue instanceof Promise ? newValue : foreignPromise(newValue, then))
		}
	}
	this._state |= $IS_FULFILLED
	this._value = newValue
	finale(this, this)
}
Promise.prototype._reject = function (newValue) {
	if (this._state & $IS_RESOLVED) {
		LST.useRejectionStack() // @[/development]
		return
	}
	this._state |= $IS_REJECTED
	this._value = newValue

	// @[development]
	if (!PASSTHROUGH_REJECTION && !(newValue instanceof Error)) {
		var type = newValue === null ? 'null' :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type, this._trace)
	}
	this._trace = LST.useRejectionStack() || this._trace
	this._addStackTraceFromError(newValue)
	// @[/]

	this._state >>> $UNHANDLED_ENDPOINTS && task(true, this, newValue)
	finale(this, this)
}
// @[development]
Promise.prototype._passthroughReject = function (newValue, trace) {
	trace !== null && LST.setRejectionStack(trace)
	PASSTHROUGH_REJECTION = true
	this._reject(newValue)
	PASSTHROUGH_REJECTION = false
}
// @[/]

// This promise must NOT be resolved.
// The given argument must be a jellypromise Promise besides `this`.
Promise.prototype._follow = function (promise) {
	while (promise._state & $IS_FOLLOWING) {
		promise = promise._value
		if (promise === this) {
			return this._reject(new TypeError('Circular promise resolution chain.'))
		}
	}
	promise._setHandled()
	var count = (promise._state >>> $UNHANDLED_ENDPOINTS) + (this._state >>> $UNHANDLED_ENDPOINTS)
	if (count > $MAX_UNHANDLED_ENDPOINTS) {
		return this._reject(new RangeError('Maximum depth of promise resolution chain exceeded.'))
	}
	promise._state = (count << $UNHANDLED_ENDPOINTS) | (promise._state & $FLAGS)

	this._state |= $IS_FOLLOWING
	this._value = promise

	if (promise._state & $IS_REJECTED) {
		count && task(true, promise, promise._value)
	}
	finale(this, promise)
}

// This is the low-level functionality of Promise#_then.
// It allows additional modification of behavior:
// - promise can be undefined, in which case the handler is invoked with two
//   extra arguments (smuggledInteger, smuggledObject) regardless of whether
//   this promise was fulfilled or rejected.
// - if promise is undefined, the handler is invoked without a try-catch
//   statement.
// This modified behavior must only be used when onFulfilled and onRejected
// are both internal functions that will not throw errors.
// Regardless of whether the modified behavior is used, smuggledInteger must
// either be $NO_INTEGER or an unsigned integer, and smuggledObject must either
// be an object or undefined.
Promise.prototype._handleNew = function (onFulfilled, onRejected, promise, smuggledInteger, smuggledObject) {
	// @[development]
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).', promise._trace)
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onRejected + 's will be ignored).', promise._trace)
	}
	// @[/]
	this._setHandled()
	return handle(this._getFollowee(), {
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise,
		smuggledInteger: smuggledInteger,
		smuggledObject: smuggledObject
	})
}
Promise.prototype._setHandled = function () {
	if (!(this._state & $IS_HANDLED)) {
		this._state |= $IS_HANDLED
		var target = this._getFollowee()
		target._state -= 1 << $UNHANDLED_ENDPOINTS
	}
}
Promise.prototype._getFollowee = function () {
	var self = this
	while (self._state & $IS_FOLLOWING) {
		self = self._value
	}
	return self
}

var finale = function (self, target) {
	if (self._state & $SINGLE_HANDLER) {
		handle(target, self._deferreds)
		self._deferreds = undefined
	} else if (self._state & $MANY_HANDLERS) {
		var deferreds = self._deferreds
		for (var i=0, len=deferreds.length; i<len; ++i) {
			handle(target, deferreds[i])
		}
		self._deferreds = undefined
	}
}

var handle = function (self, deferred) {
	if (!(self._state & $IS_FINAL)) {
		if (!(self._state & $HAS_SOME_HANDLER)) {
			self._state |= $SINGLE_HANDLER
			self._deferreds = deferred
		} else if (self._state & $SINGLE_HANDLER) {
			self._state = self._state & ~$SINGLE_HANDLER | $MANY_HANDLERS
			self._deferreds = [self._deferreds, deferred]
		} else {
			self._deferreds.push(deferred)
		}
	} else {
		task(false, self, deferred)
	}
}

var handleSettled = function (deferred) {
	var isFulfilled = this._state & $IS_FULFILLED
	var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
	if (cb === null) {
		if (deferred.promise) {
			if (isFulfilled) {
				deferred.promise._trace = this._trace // @[/development]
				deferred.promise._resolve(this._value)
			} else {
				deferred.promise._reject(this._value) // @[/production]
				deferred.promise._passthroughReject(this._value, this._trace) // @[/development]
			}
		}
	} else {
		handleSettledWithCallback.call(this, deferred, cb)
	}
}

var handleSettledWithCallback = function (deferred, cb) {
	if (deferred.promise) {
		LST.setContext(this, deferred) // @[/development]
		var ret = deferred.smuggledInteger === $NO_INTEGER
			? tryCallOne(cb, this._value)
			: tryCallTwo(cb, this._value, deferred.smuggledInteger)
		LST.releaseContext() // @[/development]
		if (ret === IS_ERROR) {
			deferred.promise._reject(LAST_ERROR)
		} else {
			deferred.promise._resolve(ret)
		}
	} else {
		cb(this._value, deferred.smuggledInteger, deferred.smuggledObject)
	}
}

var onUnhandledRejection = function (reason) {
	if (this._state >>> $UNHANDLED_ENDPOINTS) {
		// @[development]
		if (Promise.suppressUnhandledRejections) {
			var originalError = console.error
			console.error = function () {console.error = originalError}
		}
		// @[/]
		console.error(
			clc.red( // @[/node]
				'Unhandled rejection'
				+ ' ' + String(reason) + '\n' + this._trace.getTrace() // @[/development]
				+ ' ' + String(reason instanceof Error && reason.stack || reason) // @[/production node]
				, reason // @[/production browser]
			) // @[/node]
		)
	}
}

var foreignPromise = function (promise, then) {
	return new Promise(function (res, rej) {return then.call(promise, res, rej)})
}

// To avoid using try/catch inside critical functions, we extract them to here.
var LAST_ERROR = null
var IS_ERROR = {}
var getThen = function (obj) {
	try {
		return obj.then
	} catch (ex) {
		LAST_ERROR = ex
		return IS_ERROR
	}
}
var tryCallOne = function (fn, a) {
	try {
		return fn(a)
	} catch (ex) {
		LAST_ERROR = ex
		return IS_ERROR
	}
}
var tryCallTwo = function (fn, a, b) {
	try {
		return fn(a, b)
	} catch (ex) {
		LAST_ERROR = ex
		return IS_ERROR
	}
}

// Returns whether the given catch predicate should catch the exception reason.
var catchesError = function (predicate, reason) {
	if (typeof predicate === 'function') {
		if (predicate === Error || predicate.prototype instanceof Error) {
			return reason instanceof predicate
		}
		return !!predicate(reason)
	}
	warn('The predicate passed to .catch() is invalid, and will be ignored.', arguments[2]._trace) // @[/development]
	return false
}

// The first function here is invoked in the normal queue, while the second
// function is invoked in the late queue.
task.init(handleSettled, onUnhandledRejection)

