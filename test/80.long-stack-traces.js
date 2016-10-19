'use strict'
var ErrorStackParser = require('error-stack-parser')
var clc = require('cli-color')
require('../tools/test/describe')('Long stack traces', function (Promise, expect, isProduction) {
	if (Promise.suppressUnhandledRejections) {
		var originalSuppressionValue = Promise.suppressUnhandledRejections
		before(function () {
			Promise.suppressUnhandledRejections = false
		})
		after(function () {
			Promise.suppressUnhandledRejections = originalSuppressionValue
		})
	}
	
	var specialLineRE = /^(Used to reject promise:|From previous event:)$/
	function cleanLines(parsedLines, lines) {
		for (var i=0; i<lines.length; ++i) {
			if (specialLineRE.test(lines[i])) {
				parsedLines.splice(i, 0, {})
			}
		}
		expect(parsedLines.length).to.equal(lines.length)
		for (var i=0; i<lines.length; ++i) {
			var fnName = parsedLines[i].functionName
			if (fnName === 'Context.<anonymous>') {
				do {
					parsedLines.splice(i, 1)
					lines.splice(i, 1)
				} while (i in lines && !specialLineRE.test(lines[i]))
			}
		}
	}
	function testTrace(trace, test) {
		return function (done) {
			var consoleError = console.error
			var isPending = true
			var productionStack
			console.error = function (str) {
				if (!isPending) {return}
				isPending = false
				console.error = consoleError
				
				str = clc.strip(str).replace(/\n+$/g, '')
				if (isProduction) {
					expect(str).to.equal('Unhandled rejection ' + productionStack)
					return done()
				}
				
				var lines = str.split('\n').slice(1)
				var parsedLines = ErrorStackParser.parse({stack: str})
				cleanLines(parsedLines, lines)
				
				expect(lines.length).to.equal(trace.length)
				for (var i=0; i<trace.length; ++i) {
					var desired = trace[i]
					if (i > 0 && i + 1 < trace.length && !/\w/.test(desired)) {
						switch (desired) {
							case '->':
								expect(lines[i]).equal('Used to reject promise:')
								break
							case '|':
								expect(lines[i]).equal('From previous event:')
								break
							case '*':
								expect(lines[i]).equal(
									process.version >= 'v4.0.0' ? 'From previous event:' : 'Used to reject promise:'
								)
								break
							default:
								return done(new Error('Improper test.'))
						}
					} else {
						expect(parsedLines[i].functionName).to.equal(desired)
					}
				}
				done()
				
			}
			test(function (error) {
				productionStack = error && error.stack || Symbol()
				return error
			})
		}
	}
	
	it('Normal callbacks with throw', testTrace(['c', '->', 'b', '|', 'a'], function a(throws) {
		Promise.resolve().then(function b() {
			return Promise.resolve().then(function c() {
				throw throws(new Error('foo'))
			})
		})
	}))
	it('Normal callbacks with rejected promise', testTrace(['c', '*', 'b', '|', 'a'], function a(throws) {
		Promise.resolve().then(function b() {
			return Promise.resolve().then(function c() {
				return Promise.reject(throws(new Error('foo')))
			})
		})
	}))
	it('Constructed promise with throw', testTrace(['c', 'b', '|', 'a'], function a(throws) {
		Promise.resolve().then(function b() {
			return new Promise(function c(resolve, reject) {
				throw throws(new Error('foo'))
			})
		})
	}))
	it('Constructed promise with rejector', testTrace(['c', 'b', '|', 'a'], function a(throws) {
		Promise.resolve().then(function b() {
			return new Promise(function c(resolve, reject) {
				reject(throws(new Error('foo')))
			})
		})
	}))
	it('Constructed promise with resolver', testTrace(['c', 'b', '|', 'a'], function a(throws) {
		Promise.resolve().then(function b() {
			return new Promise(function c(resolve, reject) {
				resolve(Promise.reject(throws(new Error('foo'))))
			})
		})
	}))
})
