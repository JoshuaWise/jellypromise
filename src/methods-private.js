'use strict'
var Promise = require('./promise')
var task = require('./task')
var clc = require('cli-color') // @[/node]
var console = require('./util').console // @[/browser]
var INTERNAL = require('./util').INTERNAL
var warn = require('./warn') // @[/development]
var LST = require('./long-stack-traces') // @[/development]
var util = require('./util') // @[/development]

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
			for (var i=0, len=predicate.length; i<len; i++) {
				if (catchesError(predicate[i], reason)) {return onRejected(reason)} // @[/production]
				if (catchesError(predicate[i], reason, newPromise)) {return onRejected(reason)} // @[/development]
			}
		} else {
			if (catchesError(predicate, reason)) {return onRejected(reason)} // @[/production]
			if (catchesError(predicate, reason, newPromise)) {return onRejected(reason)} // @[/development]
		}
		LST.setRejectionStack(self._getFollowee()._trace) // @[/development]
		newPromise._reject(reason)
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
			this._state |= $IS_FOLLOWING
			this._value = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._state & $HAS_SOME_HANDLER) {
				finale(this)
			} else if (this._state & $SUPPRESS_UNHANDLED_REJECTIONS) {
				this._getFollowee()._state |= $SUPPRESS_UNHANDLED_REJECTIONS
			}
			return
		}
	}
	this._state |= $IS_FULFILLED
	this._value = newValue
	finale(this)
}
Promise.prototype._reject = function (newValue) {
	if (this._state & $IS_RESOLVED) {
		LST.useRejectionStack() // @[/development]
		return
	}
	this._state |= $IS_REJECTED
	this._value = newValue
	
	// @[development]
	if (!util.PASSTHROUGH_REJECTION && !(newValue instanceof Error)) {
		var type = newValue === null ? 'null' :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type, this._trace)
	}
	this._trace = LST.useRejectionStack() || this._trace
	this._addStackTraceFromError(newValue)
	// @[/]
	
	if (!(this._state & $SUPPRESS_UNHANDLED_REJECTIONS)) {
		task(true, this, newValue)
	}
	finale(this)
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
	return this._handle({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise,
		smuggledInteger: smuggledInteger,
		smuggledObject: smuggledObject
	})
}
Promise.prototype._handle = function (deferred) {
	var self = this._getFollowee()
	var state = self._state
	if (!(state & $SUPPRESS_UNHANDLED_REJECTIONS)) {
		self._state |= $SUPPRESS_UNHANDLED_REJECTIONS
	}
	if (!(state & $IS_FINAL)) {
		if (!(state & $HAS_SOME_HANDLER)) {
			self._state |= $SINGLE_HANDLER
			self._deferreds = deferred
		} else if (state & $SINGLE_HANDLER) {
			self._state = state & ~$SINGLE_HANDLER | $MANY_HANDLERS
			self._deferreds = [self._deferreds, deferred]
		} else {
			self._deferreds.push(deferred)
		}
	} else {
		task(false, self, deferred)
	}
}
Promise.prototype._getFollowee = function () {
	var self = this
	while (self._state & $IS_FOLLOWING) {
		self = self._value
	}
	return self
}

var finale = function (self) {
	if (self._state & $SINGLE_HANDLER) {
		self._handle(self._deferreds)
		self._deferreds = undefined
	} else if (self._state & $MANY_HANDLERS) {
		var deferreds = self._deferreds
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._handle(deferreds[i])
		}
		self._deferreds = undefined
	}
}

var handleSettled = function (deferred) {
	var isFulfilled = this._state & $IS_FULFILLED
	var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
	if (cb === null) {
		if (deferred.promise) {
			deferred.promise._trace = this._trace // @[/development]
			if (isFulfilled) {
				deferred.promise._resolve(this._value)
			} else {
				util.PASSTHROUGH_REJECTION = true // @[/development]
				deferred.promise._reject(this._value)
				util.PASSTHROUGH_REJECTION = false // @[/development]
			}
		}
	} else {
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
}

var onUnhandledRejection = function (reason) {
	if (!(this._state & $SUPPRESS_UNHANDLED_REJECTIONS)) {
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
function getThen(obj) {
	try {
		return obj.then
	} catch (ex) {
		LAST_ERROR = ex
		return IS_ERROR
	}
}
function tryCallOne(fn, a) {
	try {
		return fn(a)
	} catch (ex) {
		LAST_ERROR = ex
		return IS_ERROR
	}
}
function tryCallTwo(fn, a, b) {
	try {
		return fn(a, b)
	} catch (ex) {
		LAST_ERROR = ex
		return IS_ERROR
	}
}

// Returns whether the given catch predicate should catch the exception reason.
var catchesError = function (predicate, reason) {
	if (predicate === Error || (predicate && predicate.prototype instanceof Error)) {
		return reason instanceof predicate
	}
	if (typeof predicate === 'function') {
		return !!predicate(reason)
	}
	warn('The predicate passed to .catch() is invalid, and will be ignored.', arguments[2]._trace) // @[/development]
	return false
}

// The first function here is invoked in the normal queue, while the second
// function is invoked in the late queue.
task.init(handleSettled, onUnhandledRejection)

