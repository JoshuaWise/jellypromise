'use strict'
var Promise = require('./core')
var toArray = require('./to-array')
var iterator = require('./iterator-symbol')

Promise.prototype.catchLater = function () {
	this._supressUnhandledRejections = true
	return this
}
Promise.prototype.finally = function (fn) {
	var cons = this.constructor
	return this.then(function (value) {
		return cons.resolve(fn()).then(function () {
			return value
		})
	}, function (reason) {
		return cons.resolve(fn()).then(function () {
			throw reason
		})
	})
}
Promise.prototype.tap = function (fn) {
	var cons = this.constructor
	return this.then(function (value) {
		return cons.resolve(fn()).then(function () {
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
Promise.any = function (iterable) {
	var arr = toArray(iterable)
	var self = this
	return new self(function (res, rej) {
		var pendings = arr.length
		if (pendings === 0) {
			throw new RangeError('Promise.any() cannot be used on an iterable with no items.')
		}
		arr.forEach(function (item, i) {
			self.resolve(item).then(res, function (reason) {
				if (--pendings === 0) {rej(reason)}
			})
		})
	})
}
Promise.props = function (obj) {
	var keys = Object.keys(obj)
	var result = {}
	var self = this
	return new self(function (res, rej) {
		var pendings = keys.length
		if (pendings === 0) {
			return res(result)
		}
		keys.forEach(function (key) {
			self.resolve(obj[key]).then(function (value) {
				result[key] = value
				if (--pendings === 0) {res(result)}
			}, rej)
		})
	})
}
Promise.join = function () {
	var len = arguments.length
	if (len > 0 && typeof arguments[len - 1] === 'function') {
		var handler = arguments[--len]
	}
	if (len > 4) {
		throw new RangeError('Promise.join can join at most 4 values (use Promise.all instead).')
	}
	var a = arguments[0]
	var b = arguments[1]
	var c = arguments[2]
	var d = arguments[3]
	var self = this
	return new self(function (res, rej) {
		var pendings = len
		function done() {
			if (--pendings === 0) {
				if (len === 0) {
					handler ? res(handler()) : res()
				} else if (len === 1) {
					handler ? res(handler(a)) : res(a)
				} else if (len === 2) {
					handler ? res(handler(a, b)) : res(a)
				} else if (len === 3) {
					handler ? res(handler(a, b, c)) : res(a)
				} else {
					handler ? res(handler(a, b, c, d)) : res(a)
				}
			}
		}
		if (len > 0) {
			self.resolve(a).then(done, rej)
			if (len > 1) {
				self.resolve(b).then(done, rej)
				if (len > 2) {
					self.resolve(c).then(done, rej)
					if (len > 3) {
						self.resolve(d).then(done, rej)
					}
				}
			}
		} else {
			handler ? res(handler()) : res()
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
	
	return new self(function (res, rej) {
		;(function next() {
			var item = it.next()
			item.done ? res()
				: self.resolve(item.value).then(fn).then(next).catch(rej)
		}())
	})
}
Promise.isPromise = function (value) {
	return value
		&& (typeof obj === 'object' || typeof obj === 'function')
		&& typeof obj.then === 'function'
}

function makeIterator(arr) {
	var i = 0
	return {next: function () {
		return i < arr.length
			? {done: false, value: arr[i++]}
			: {done: true}
	}}
}
