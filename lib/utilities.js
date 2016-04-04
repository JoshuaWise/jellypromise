'use strict'
var Promise = require('./core')

Promise.prototype.catchLater = function () {
	this._supressUnhandledRejections = true
	return this
}
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
