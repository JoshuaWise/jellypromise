'use strict'
var Promise = require('./promise')
var task = require('./task').init(handleSettled, onUnhandledRejection)
var console = require('./util').console // @[/browser]
var INTERNAL = require('./util').INTERNAL
var warn = require('./warn') // @[/development]
var LST = require('./long-stack-traces') // @[/development]
var PASSTHROUGH_REJECTION = false // @[/development]

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._44 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	promise._45(2) // @[/development]
	this._19(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._56 = function (handler) {
	this._45(2) // @[/development]
	var ret = tryCallTwo(handler, this._35(), this._9())
	if (ret === IS_ERROR) {
		this._65(LAST_ERROR)
	}
	return this
}

Promise.prototype._35 = function () {
	var self = this
	return function (value) {self._11(value)}
}
Promise.prototype._9 = function () {
	var self = this
	return function (reason) {self._65(reason)}
}

Promise.prototype._11 = function (newValue) {
	if (this._84 & 7) {
		return
	}
	if (newValue === this) {
		return this._65(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._65(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._84 |= 4
			this._75 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._84 & 24) {
				finale(this)
			} else if (this._84 & 32) {
				this._21()._84 |= 32
			}
			return
		}
	}
	this._84 |= 1
	this._75 = newValue
	finale(this)
}
Promise.prototype._65 = function (newValue) {
	if (this._84 & 7) {
		LST.useRejectionStack() // @[/development]
		return
	}
	this._84 |= 2
	this._75 = newValue
	
	if (!PASSTHROUGH_REJECTION && !(newValue instanceof Error)) {
		var type = newValue === null ? 'null' :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type, this._71)
	}
	this._71 = LST.useRejectionStack() || this._71
	this._32(newValue)
	
	if (!(this._84 & 32)) {
		task(true, this, newValue)
	}
	finale(this)
}

Promise.prototype._19 = function (onFulfilled, onRejected, promise) {
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).', promise._71)
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onRejected + 's will be ignored).', promise._71)
	}
	return this._54({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._54 = function (deferred) {
	var self = this._21()
	var state = self._84
	if (!(state & 32)) {
		self._84 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._84 |= 8
			self._33 = deferred
		} else if (state & 8) {
			self._84 = state & ~8 | 16
			self._33 = [self._33, deferred]
		} else {
			self._33.push(deferred)
		}
	} else {
		task(false, self, deferred)
	}
}
Promise.prototype._21 = function () {
	var self = this
	while (self._84 & 4) {
		self = self._75
	}
	return self
}

function finale(self) {
	if (self._84 & 8) {
		self._54(self._33)
		self._33 = null
	} else if (self._84 & 16) {
		var deferreds = self._33
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._54(deferreds[i])
		}
		self._33 = null
	}
}

function handleSettled(deferred) {
	var isFulfilled = this._84 & 1
	var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
	if (cb === null) {
		deferred.promise._71 = this._71 // @[/development]
		if (isFulfilled) {
			deferred.promise._11(this._75)
		} else {
			PASSTHROUGH_REJECTION = true // @[/development]
			deferred.promise._65(this._75)
			PASSTHROUGH_REJECTION = false // @[/development]
		}
	} else {
		LST.setContext(this, deferred) // @[/development]
		var ret = tryCallOne(cb, this._75)
		LST.releaseContext() // @[/development]
		if (ret === IS_ERROR) {
			deferred.promise._65(LAST_ERROR)
		} else {
			deferred.promise._11(ret)
		}
	}
}

function onUnhandledRejection(reason) {
	if (!(this._84 & 32)) {
		if (Promise.suppressUnhandledRejections) {
			var originalError = console.error
			console.error = function () {console.error = originalError}
		}
		console.error(
				'Unhandled rejection'
				+ ' ' + String(reason) + '\n' + this._71.getTrace() // @[/development]
		)
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
