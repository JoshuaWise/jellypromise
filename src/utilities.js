'use strict'
var Promise = require('./core')
var arrayFrom = require('./array-from')
var iterator = require('./iterator-symbol')
var TimeoutError = require('./timeout-error')
var resolve = require('./shared').resolve
var noop = require('./shared').noop

Promise.prototype.finally = function (fn) {
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
		var p = new Promise(noop)
		setTimeout(function () {
			resolve(p, value)
		}, +ms)
		return p
	})
}
Promise.prototype.timeout = function (ms, reason) {
	if (reason == null) {
		reason = new TimeoutError('The operation timed out after ' + +ms + ' milliseconds.')
	} else if (!(reason instanceof Error)) {
		reason = new TimeoutError(String(reason))
	}
	var self = this
	return new Promise(function (res, rej) {
		var timer = setTimeout(function () {rej(reason)}, +ms)
		self.then(res, rej)
	})
}
Promise.any = function (iterable) {
	var arr = arrayFrom(iterable)
	return new Promise(function (res, rej) {
		var pendings = arr.length
		if (pendings === 0) {
			throw new RangeError('Promise.any() cannot be used on an iterable with no items.')
		}
		function fail(reason) {
			if (--pendings === 0) {rej(reason)}
		}
		for (var i=0; i<pendings; i++) {
			Promise.resolve(item).then(res, fail)
		}
	})
}
Promise.iterate = function (iterable, fn) {
	if (iterator && typeof iterable[iterator] === 'function') {
		var it = iterable[iterator]()
	} else if (typeof iterable.length === 'number') {
		var it = makeIterator(iterable)
	} else {
		throw new TypeError('Expected argument to be an iterable or array-like object.')
	}
	return new Promise(function (res, rej) {
		;(function next() {
			var item = it.next()
			item.done ? res()
				: Promise.resolve(item.value).then(fn).then(next).catch(rej)
		}())
	})
}
Promise.props = function (obj) {
	var keys = Object.keys(obj)
	var result = {}
	return new Promise(function (res, rej) {
		var pendings = keys.length
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
Promise.join = function (a, b, handler) {
	return new Promise(function (res, rej) {
		var halfDone = false
		var other;
		function done(value) {
			if (halfDone) {
				handler ? res(handler(a, b)) : res(a)
			} else {
				other = value
				halfDone = true
			}
		}
		Promise.resolve(a).then(done).catch(rej)
		Promise.resolve(b).then(done).catch(rej)
	})
}
Promise.partition = function (iterable, handler) {
	var arr = arrayFrom(iterable)
	var resolved = []
	var rejected = []
	return new Promise(function (res, rej) {
		var pendings = arr.length
		if (pendings === 0) {
			return handler ? res(handler(resolved, rejected)) : res(resolved)
		}
		for (var i=0; i<pendings; i++) {
			Promise.resolve(arr[i]).then(pushResolved, pushRejected)
		}
		function pushResolved(value) {
			resolved.push(value)
			--pendings || (handler ? res(handler(resolved, rejected)) : res(resolved))
		}
		function pushRejected(value) {
			rejected.push(value)
			--pendings || (handler ? res(handler(resolved, rejected)) : res(resolved))
		}
	})
}
Promise.isPromise = function (value) {
	return value
		&& (typeof value === 'object' || typeof value === 'function')
		&& typeof value.then === 'function'
}
Promise.TimeoutError = TimeoutError

function makeIterator(arr) {
	var i = 0
	return {next: function () {
		return i < arr.length
			? {done: false, value: arr[i++]}
			: {done: true}
	}}
}
