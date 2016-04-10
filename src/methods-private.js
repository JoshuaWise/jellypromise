'use strict'
var Promise = require('./promise')
var asap = require('asap/raw')
var clc = require('cli-color') // @[/development node]
var warn = require('./warn') // @[/development]

Promise.prototype._resolveFromHandler = function (handler) {
	var self = this
	var res = tryCallTwo(handler, function (value) {
		self._resolve(value)
	}, function (reason) {
		self._reject(reason)
	})
	if (res === IS_ERROR) {
		self._reject(LAST_ERROR)
	}
}
Promise.prototype._resolve = function (newValue) {
	if (this._state & $IS_RESOLVED) {
		return
	}
	if (newValue === this) {
		return this._reject(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue != null && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._reject(LAST_ERROR)
		}
		if (typeof then === 'function') {
			if (!(newValue instanceof Promise)) {
				// Foreign promises must be converted to trusted promises.
				newValue = new Promise(then.bind(newValue))
			}
			this._state |= $IS_FOLLOWING
			this._value = newValue
			finale(this)
			return
		}
	}
	this._state |= $IS_FULFILLED
	this._value = newValue
	finale(this)
}
Promise.prototype._reject = function (newValue) {
	if (this._state & $IS_RESOLVED) {
		return
	}
	this._state |= $IS_REJECTED
	this._value = newValue
	
	// @[development]
	if (!(newValue instanceof Error)) {
		var type = newValue === null ? null :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type)
	}
	// @[/]
	
	if (!(this._state & $SUPRESS_UNHANDLED_REJECTIONS)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}
Promise.prototype._handleNew = function (onFulfilled, onRejected, promise) {
	// @[development]
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).')
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onRejected + 's will be ignored).')
	}
	// @[/]
	return this._handle({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._handle = function (deferred) {
	var self = this
	while (self._state & $IS_FOLLOWING) {
		self = self._value
	}
	var state = self._state
	if (!(state & $SUPRESS_UNHANDLED_REJECTIONS)) {
		self._state |= $SUPRESS_UNHANDLED_REJECTIONS
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
		handleSettled(self, deferred)
	}
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._state & $IS_FULFILLED
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			if (isFulfilled) {
				deferred.promise._resolve(self._value)
			} else {
				deferred.promise._reject(self._value)
			}
		} else {
			var ret = tryCallOne(cb, self._value)
			if (ret === IS_ERROR) {
				deferred.promise._reject(LAST_ERROR)
			} else {
				deferred.promise._resolve(ret)
			}
		}
	})
}

function finale(self) {
	if (self._state & $SINGLE_HANDLER) {
		self._handle(self._deferreds)
		self._deferreds = null
	} else if (self._state & $MANY_HANDLERS) {
		var deferreds = self._deferreds
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._handle(deferreds[i])
		}
		self._deferreds = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._state & $SUPRESS_UNHANDLED_REJECTIONS)) {
			console.error(
				clc.red( // @[/development node]
					'Unhandled rejection ' + (reason instanceof Error
						? reason.stack || (reason.name + ': ' + reason.message)
						: String(reason))
				) // @[/development node]
			)
		}
	}
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
		fn(a, b)
	} catch (ex) {
		LAST_ERROR = ex
		return IS_ERROR
	}
}
