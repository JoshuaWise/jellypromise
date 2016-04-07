var tests = require('promises-aplus-tests')
var Promise = require('../');

tests.mocha({
	deferred: function () {
		var resolve, reject
		var promise = new Promise(function (res, rej) {
			resolve = res
			reject = rej
		})
		return {
			promise: promise,
			resolve: resolve,
			reject: reject
		}
	},
	resolved: Promise.resolve,
	rejected: Promise.reject,
})
