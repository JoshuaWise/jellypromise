'use strict'
require('../tools/describe')('.catch', function (Promise, expect) {
	it('should log an error for unhandled rejections', function (done) {
		new Promise(function (res, rej) {rej(new Error('foo bar'))})
		var timer = setTimeout(function () {
			cancel()
			done(new Error('console.error was not invoked.'))
		}, 100)
		var cancel = hookConsole(function () {
			clearTimeout(timer)
			done()
		})
	})
	it('should prevent an error from being logged', function (done) {
		var p = new Promise(function (res, rej) {rej(new Error('foo bar'))}).catchLater()
		var timer = setTimeout(function () {
			cancel()
			p.then(function () {
				done(new Error('The promise was not rejected.'))
			}, function () {
				done()
			})
		}, 120)
		var cancel = hookConsole(function () {
			clearTimeout(timer)
			done(new Error('console.error was invoked.'))
		})
	})
})

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
	return function () {
		if (isPending) {
			isPending = false
			console.error = consoleError
		}
	}
}
