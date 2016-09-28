'use strict'
var ErrorStackParser = require('error-stack-parser')
var clc = require('cli-color')
require('../tools/test/describe')('Long stack traces', function (Promise, expect) {
	if (Promise.suppressUnhandledRejections) {
		var originalSuppressionValue = Promise.suppressUnhandledRejections
		before(function () {
			Promise.suppressUnhandledRejections = false
		})
		after(function () {
			Promise.suppressUnhandledRejections = originalSuppressionValue
		})
	}
	
	function cleanLines(parsedLines, lines) {
		for (var i=0; i<lines.length; ++i) {
			if (lines[i] === 'Used to reject promise:' || lines[i] === 'From previous event:') {
				parsedLines.splice(i, 0, {})
			}
		}
		expect(parsedLines.length).to.equal(lines.length)
		for (var i=0; i<lines.length; ++i) {
			var file = parsedLines[i].fileName
			if (file === 'module.js' || file === 'bootstrap_node.js') {
				parsedLines.splice(i, 1)
				lines.splice(i, 1)
				--i
			}
		}
	}
	function testTrace(trace, test) {
		return function (done) {
			var consoleError = console.error
			var isPending = true
			console.error = function (str) {
				if (!isPending) {return}
				isPending = false
				console.error = consoleError
				str = clc.strip(str).replace(/\n+$/g, '')
				var lines = str.split('\n').slice(1)
				var parsedLines = ErrorStackParser.parse({stack: str})
				cleanLines(parsedLines, lines)
				expect(lines.length).to.equal(trace.length)
				for (var i=0; i<trace.length; ++i) {
					var desired = trace[i]
					if (i > 0 && i + 1 < trace.length && /\[.*\]/.test(desired)) {
						switch (desired) {
							case '[used for]':
								expect(lines[i]).equal('Used to reject promise:')
								break
							case '[from]':
								expect(lines[i]).equal('From previous event:')
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
			test()
		}
	}
	
	it('foo bar', testTrace([], function () {
		Promise.resolve().then(function () {
			return Promise.resolve().then(function () {
				throw new Error('foo')
			})
		})
	}))
})
