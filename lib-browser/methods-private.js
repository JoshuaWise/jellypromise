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
Promise.prototype._97 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	promise._56(2) // @[/development]
	this._38(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._70 = function (handler) {
	this._56(2) // @[/development]
	var ret = tryCallTwo(handler, this._23(), this._85())
	if (ret === IS_ERROR) {
		this._49(LAST_ERROR)
	}
	return this
}

Promise.prototype._23 = function () {
	var self = this
	return function (value) {self._73(value)}
}
Promise.prototype._85 = function () {
	var self = this
	return function (reason) {self._49(reason)}
}

Promise.prototype._73 = function (newValue) {
	if (this._19 & 7) {
		return
	}
	if (newValue === this) {
		return this._49(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._49(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._19 |= 4
			this._54 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._19 & 24) {
				finale(this)
			} else if (this._19 & 32) {
				this._94()._19 |= 32
			}
			return
		}
	}
	this._19 |= 1
	this._54 = newValue
	finale(this)
}
Promise.prototype._49 = function (newValue) {
	if (this._19 & 7) {
		LST.useRejectionStack() // @[/development]
		return
	}
	this._19 |= 2
	this._54 = newValue
	
	if (!PASSTHROUGH_REJECTION && !(newValue instanceof Error)) {
		var type = newValue === null ? 'null' :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type, this._87)
	}
	this._87 = LST.useRejectionStack() || this._87
	this._71(newValue)
	
	if (!(this._19 & 32)) {
		task(true, this, newValue)
	}
	finale(this)
}

Promise.prototype._38 = function (onFulfilled, onRejected, promise) {
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).', promise._87)
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onRejected + 's will be ignored).', promise._87)
	}
	return this._78({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._78 = function (deferred) {
	var self = this._94()
	var state = self._19
	if (!(state & 32)) {
		self._19 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._19 |= 8
			self._32 = deferred
		} else if (state & 8) {
			self._19 = state & ~8 | 16
			self._32 = [self._32, deferred]
		} else {
			self._32.push(deferred)
		}
	} else {
		task(false, self, deferred)
	}
}
Promise.prototype._94 = function () {
	var self = this
	while (self._19 & 4) {
		self = self._54
	}
	return self
}

function finale(self) {
	if (self._19 & 8) {
		self._78(self._32)
		self._32 = null
	} else if (self._19 & 16) {
		var deferreds = self._32
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._78(deferreds[i])
		}
		self._32 = null
	}
}

function handleSettled(deferred) {
	var isFulfilled = this._19 & 1
	var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
	if (cb === null) {
		deferred.promise._87 = this._87 // @[/development]
		if (isFulfilled) {
			deferred.promise._73(this._54)
		} else {
			PASSTHROUGH_REJECTION = true // @[/development]
			deferred.promise._49(this._54)
			PASSTHROUGH_REJECTION = false // @[/development]
		}
	} else {
		LST.setContext(this, deferred) // @[/development]
		var ret = tryCallOne(cb, this._54)
		LST.releaseContext() // @[/development]
		if (ret === IS_ERROR) {
			deferred.promise._49(LAST_ERROR)
		} else {
			deferred.promise._73(ret)
		}
	}
}

function onUnhandledRejection(reason) {
	if (!(this._19 & 32)) {
		if (Promise.suppressUnhandledRejections) {
			var originalError = console.error
			console.error = function () {console.error = originalError}
		}
		console.error(
				'Unhandled rejection'
				+ ' ' + String(reason) + '\n' + this._87.getTrace() // @[/development]
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
