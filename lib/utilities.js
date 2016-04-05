'use strict'
var Promise = require('./core')
var toArray = require('./to-array')

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
	// return this.catch(function () {return value})
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
	var arr = new Array(len)
	for (var i=0; i<len; i++) {
		arr[i] = arguments[i]
	}
	if (handler) {
		return this.all(arr).then(function (results) {return handler.apply(this, results)})
	}
	return this.all(arr).then(function (results) {return results[0]})
}
Promise.isPromise = function (value) {
	return value
		&& (typeof obj === 'object' || typeof obj === 'function')
		&& typeof obj.then === 'function'
}
