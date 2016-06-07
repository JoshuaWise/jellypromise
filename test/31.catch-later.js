'use strict'
require('../tools/test/describe')('.catchLater', function (Promise, expect) {
	if (Promise.suppressUnhandledRejections) {
		var originalSuppressionValue = Promise.suppressUnhandledRejections
		before(function () {
			Promise.suppressUnhandledRejections = false
		})
		after(function () {
			Promise.suppressUnhandledRejections = originalSuppressionValue
		})
	}
	
	function hookConsole(cb) {
		var consoleError = console.error
		var isPending = true
		console.error = function () {
			if (isPending) {
				isPending = false
				console.error = consoleError
				cb()
			}
		}
		return function cancel() {
			if (isPending) {
				isPending = false
				console.error = consoleError
			}
		}
	}
	function testPromises(test) {
		specify('on a terminal promise', function (done) {
			return test(done, Promise.reject(new Error('foo bar')))
		})
		specify('on a following promise', function (done) {
			return test(done, new Promise(function (res) {
				res(Promise.reject(new Error('foo bar')))
			}))
		})
		specify('on an eventually following promise', function (done) {
			return test(done, Promise.resolve().then(function () {
				return Promise.reject(new Error('foo bar'))
			}))
		})
	}
	
	describe('when omitted, should log an error for unhandled rejections', function () {
		testPromises(function (done, promise) {
			var timer = setTimeout(function () {
				cancel()
				done(new Error('console.error was not invoked.'))
			}, 10)
			var cancel = hookConsole(function () {
				clearTimeout(timer)
				done()
			})
		})
	})
	describe('should prevent an error from being logged for unhandled rejections', function () {
		testPromises(function (done, promise) {
			promise.catchLater()
			var timer = setTimeout(function () {
				cancel()
				promise.then(function () {
					done(new Error('The promise was not rejected.'))
				}, function () {
					done()
				})
			}, 30)
			var cancel = hookConsole(function () {
				clearTimeout(timer)
				done(new Error('console.error was invoked.'))
			})
		})
	})
})
