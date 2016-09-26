'use strict'
var Promise = require('./promise')
var asap = require('asap/raw')
var console = require('./util').console // @[/browser]
var INTERNAL = require('./util').INTERNAL
var warn = require('./warn') // @[/development]
var LST = require('./long-stack-traces') // @[/development]
var PASSTHROUGH_REJECTION = false // @[/development]

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._9 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	promise._1(2) // @[/development]
	this._33(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._95 = function (handler) {
	this._1(2) // @[/development]
	var ret = tryCallTwo(handler, this._36(), this._94())
	if (ret === IS_ERROR) {
		this._38(LAST_ERROR)
	}
	return this
}

Promise.prototype._36 = function () {
	var self = this
	return function (value) {self._3(value)}
}
Promise.prototype._94 = function () {
	var self = this
	return function (reason) {self._38(reason)}
}

Promise.prototype._3 = function (newValue) {
	if (this._22 & 7) {
		return
	}
	if (newValue === this) {
		return this._38(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._38(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._22 |= 4
			this._16 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._22 & 24) {
				finale(this)
			} else if (this._22 & 32) {
				this._56()._22 |= 32
			}
			return
		}
	}
	this._22 |= 1
	this._16 = newValue
	finale(this)
}
Promise.prototype._38 = function (newValue) {
	if (this._22 & 7) {
		LST.useRejectionStack() // @[/development]
		return
	}
	this._22 |= 2
	this._16 = newValue
	
	if (!PASSTHROUGH_REJECTION && !(newValue instanceof Error)) {
		var type = newValue === null ? 'null' :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type, this._87)
	}
	this._87 = LST.useRejectionStack() || this._87
	this._65(newValue)
	
	if (!(this._22 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._33 = function (onFulfilled, onRejected, promise) {
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).', promise._87)
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onRejected + 's will be ignored).', promise._87)
	}
	return this._91({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._91 = function (deferred) {
	var self = this._56()
	var state = self._22
	if (!(state & 32)) {
		self._22 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._22 |= 8
			self._42 = deferred
		} else if (state & 8) {
			self._22 = state & ~8 | 16
			self._42 = [self._42, deferred]
		} else {
			self._42.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._56 = function () {
	var self = this
	while (self._22 & 4) {
		self = self._16
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._22 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			deferred.promise._87 = self._87 // @[/development]
			if (isFulfilled) {
				deferred.promise._3(self._16)
			} else {
				PASSTHROUGH_REJECTION = true // @[/development]
				deferred.promise._38(self._16)
				PASSTHROUGH_REJECTION = false // @[/development]
			}
		} else {
			LST.setContext(self, deferred) // @[/development]
			var ret = tryCallOne(cb, self._16)
			LST.releaseContext() // @[/development]
			if (ret === IS_ERROR) {
				deferred.promise._38(LAST_ERROR)
			} else {
				deferred.promise._3(ret)
			}
		}
	})
}

function finale(self) {
	if (self._22 & 8) {
		self._91(self._42)
		self._42 = null
	} else if (self._22 & 16) {
		var deferreds = self._42
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._91(deferreds[i])
		}
		self._42 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._22 & 32)) {
			if (Promise.suppressUnhandledRejections) {
				var originalError = console.error
				console.error = function () {console.error = originalError}
			}
			console.error(
					'Unhandled rejection'
					+ ' ' + String(reason) + '\n' + self._87.getTrace() // @[/development]
			)
		}
	}
}

function foreignPromise(promise, then) {
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
		fn(a, b)
	} catch (ex) {
		LAST_ERROR = ex
		return IS_ERROR
	}
}
