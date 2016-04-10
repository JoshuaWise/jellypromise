'use strict'
var Promise = require('./promise')
var TimeoutError = require('./timeout-error')
var warn = require('./warn')
var asArray = require('./util').asArray
var iterator = require('./util').iterator
var INTERNAL = require('./util').INTERNAL

Promise.prototype.finally = function (fn) {
	if (typeof fn !== 'function') {
		// Will be bypassed, but produces a warning in development mode.
		return this.then(fn)
	}
	return this.then(function (value) {
		return Promise.resolve(fn()).then(function () {
			return value
		})
	}, function (reason) {
		return Promise.resolve(fn()).then(function () {
			throw reason
		})
	})
}
Promise.prototype.tap = function (fn) {
	if (typeof fn !== 'function') {
		// Will be bypassed, but produces a warning in development mode.
		return this.then(fn)
	}
	return this.then(function (value) {
		return Promise.resolve(fn()).then(function () {
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
	return this.catch(function () {return value})
}
Promise.prototype.delay = function (ms) {
	return this.then(function (value) {
		var p = new Promise(INTERNAL)
		setTimeout(function () {
			p._resolve(value)
		}, ~~ms)
		return p
	})
}
Promise.prototype.timeout = function (ms, reason) {
	var self = this
	return new Promise(function (res, rej) {
		if (reason == null) {
			reason = new TimeoutError('The operation timed out after ' + ~~ms + ' milliseconds.')
		} else if (!(reason instanceof Error)) {
			reason = new TimeoutError(String(reason))
		}
		setTimeout(function () {rej(reason)}, ~~ms)
		self.then(res, rej)
	})
}
Promise.prototype.log = function (prefix) {
	var usePrefix = arguments.length > 0
	return this.then(function (value) {
		usePrefix ? console.log(prefix, value)
		          : console.log(value)
	})
}
Promise.any = function (iterable) {
	return new Promise(function (res, rej) {
		var input = asArray(iterable)
		var pendings = input.length
		if (pendings === 0) {
			return rej(new Error('The iterable argument contained no items.'))
		}
		var fail = function (reason) {
			if (--pendings === 0) {rej(reason)}
		}
		for (var i=0; i<pendings; i++) {
			Promise.resolve(input[i]).then(res, fail)
		}
	})
}
Promise.props = function (obj) {
	return new Promise(function (res, rej) {
		var keys = Object.keys(obj)
		var pendings = keys.length
		var result = {}
		if (pendings === 0) {
			return res(result)
		}
		keys.forEach(function (key) {
			Promise.resolve(obj[key]).then(function (value) {
				result[key] = value
				if (--pendings === 0) {res(result)}
			}, rej)
		})
	})
}
Promise.partition = function (iterable, handler) {
	return new Promise(function (res, rej) {
		// @[development]
		if (typeof handler !== 'function' && handler != null) {
			warn('Handlers must be functions (' + typeof handler + 's will be ignored).')
		}
		// @[/]
		if (typeof handler !== 'function') {
			handler = null
		}
		var input = asArray(iterable)
		var pendings = input.length
		var resolved = []
		var rejected = []
		if (pendings === 0) {
			return handler ? res(handler(resolved, rejected)) : res(resolved)
		}
		var pushResolved = function (value) {
			resolved.push(value)
			if (--pendings === 0) {
				handler ? res(handler(resolved, rejected)) : res(resolved)
			}
		}
		var pushRejected = function (reason) {
			rejected.push(reason)
			if (--pendings === 0) {
				handler ? res(handler(resolved, rejected)) : res(resolved)
			}
		}
		for (var i=0; i<pendings; i++) {
			Promise.resolve(input[i]).then(pushResolved, pushRejected)
		}
	})
}
Promise.iterate = function (iterable, fn) {
	return new Promise(function (res, rej) {
		// @[development]
		if (typeof fn !== 'function' && fn != null) {
			warn('Handlers must be functions (' + typeof fn + 's will be ignored).')
		}
		// @[/]
		if (typeof fn !== 'function') {
			fn = null
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
			item.done ? res()
				: Promise.resolve(item.value).then(fn).then(next).catch(rej)
		}())
	})
}
Promise.join = function (a, b, handler) {
	return new Promise(function (res, rej) {
		// @[development]
		if (typeof handler !== 'function' && handler != null) {
			warn('Handlers must be functions (' + typeof handler + 's will be ignored).')
		}
		// @[/]
		if (typeof handler !== 'function') {
			handler = null
		}
		var done = function (value) {
			if (halfDone) {
				if (p1._state & IS_RESOLVED) {
					handler ? res(handler(p1._value, value)) : res(p1._value)
				} else {
					handler ? res(handler(value, p2._value)) : res(value)
				}
			} else {
				halfDone = true
			}
			return value
		}
		var halfDone = false
		var p1 = Promise.resolve(a).then(done)
		var p2 = Promise.resolve(b).then(done)
		p1.catch(rej)
		p2.catch(rej)
	})
}
Promise.isPromise = function (value) {
	return value
		&& (typeof value === 'object' || typeof value === 'function')
		&& typeof value.then === 'function'
}
Promise.TimeoutError = TimeoutError

function makeIterator(array) {
	var i = 0
	return {next: function () {
		return i < array.length
			? {done: false, value: array[i++]}
			: {done: true}
	}}
}
