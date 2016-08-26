'use strict'
var ArrayTester = require('../tools/test/array-tester')
var Thenable = require('../tools/test/thenable')
var shallowEquals = require('../tools/test/shallow-equals')
var makeIterable = require('../tools/test/make-iterable')
var testNonIterables = require('../tools/test/test-non-iterables')
var testNonFunctions = require('../tools/test/test-non-functions')
require('../tools/test/describe')('.filter', function (Promise, expect) {
	var arrayTester = new ArrayTester(Promise)
	function returnsTrue(val, i, len) {return true}
	function expectToMatch(input, source) {
		var callbackValues = new Array(source.length)
		var lenAlwaysCorrect = true
		var indexNeverGivenTwice = true
		if (useIterable) {
			useIterable = false
			input = makeIterable(input)
		}
		currentInputPromise = Promise.resolve(input)
		return currentInputPromise.filter(function (val, i, len) {
			if (len !== source.length) {
				lenAlwaysCorrect = false
			}
			if (i in callbackValues) {
				indexNeverGivenTwice = false
			}
			callbackValues[i] = val
			return true
		}).then(function (result) {
			var matchesSource = shallowEquals(source)
			expect(lenAlwaysCorrect).to.be.true
			expect(indexNeverGivenTwice).to.be.true
			expect(result).to.satisfy(matchesSource)
			expect(callbackValues).to.satisfy(matchesSource)
		})
	}
	var currentInputPromise = null // Use only synchronously after invoking expectToMatch().
	var useIterable = false // Use only synchronously before invoking expectToMatch().
	
	function expectABC(fn) {
		return expect(Promise.resolve(['a', 'b', 'c']).filter(fn))
	}
	
	it('should be ignored given a rejected promise', function () {
		var array = [123]
		var neverInvoked = true
		var p = Promise.reject(array).filter(function (val, i, len) {
			neverInvoked = false
			return true
		})
		return p.then(function () {
			throw new Error('This promise should have been rejected.')
		}, function (reason) {
			expect(reason).to.equal(array)
			expect(neverInvoked).to.be.true
		})
	})
	it('should be fulfilled given an empty array', function () {
		var array = []
		return expectToMatch(array, array)
	})
	it('should treat deleted keys as undefined', function () {
		var array = new Array(3)
		return expectToMatch(array, array)
	})
	it('should treat strings as iterables, if ES6 iterables are supported', function () {
		if (typeof Symbol !== 'function' || !Symbol.iterator) {
			var p = Promise.resolve('hello').filter(returnsTrue)
			return expect(p).to.be.rejectedWith(TypeError)
		}
		return expectToMatch('hello', ['h', 'e', 'l', 'l', 'o'])
	})
	describe('should be rejected on invalid input', function () {
		testNonIterables(function (value) {
			var p = Promise.resolve(value).filter(returnsTrue)
			return expect(p).to.be.rejectedWith(TypeError)
		})
	})
	describe('should be rejected when not given a callback function', function () {
		testNonFunctions(function (value) {
			var p = Promise.resolve([]).filter(value)
			return expect(p).to.be.rejectedWith(TypeError)
		})
		specify('given: no arguments', function () {
			var p = Promise.resolve([]).filter()
			return expect(p).to.be.rejectedWith(TypeError)
		})
	})
	describe('should be fulfilled with an array of values', function () {
		var irrelevantPromise = Promise.reject(new Error('baz')).catchLater()
		arrayTester.test([[irrelevantPromise], 123], expectToMatch)
	})
	describe('should not be affected by changing the input array after its fulfillment', function () {
		arrayTester.test(['foo', ''], function (input, source) {
			var ret = expectToMatch(input, source)
			currentInputPromise.then(function (array) {
				array[0] = 'bar'
				delete array[1]
				array.length = 1
			})
			return ret
		})
	})
	describe('should not be affected by changing the input iterable after its fulfillment', function () {
		arrayTester.test(['foo', ''], function (input, source) {
			useIterable = true
			var ret = expectToMatch(input, source)
			currentInputPromise.then(function (array) {
				array[0] = 'bar'
				delete array[1]
				array.length = 1
			})
			return ret
		})
	})
	describe('should be rejected when the input array contains a rejected promise', function () {
		var err = new Error('baz')
		arrayTester.test([123, Promise.reject(err)], function (input, source) {
			var p = Promise.resolve(input).filter(returnsTrue)
			return expect(p).to.be.rejectedWith(err)
		})
	})
	describe('should be rejected by the input array\'s earliest rejected promise', function () {
		var errors = [new Error('baz'), new Error('quux')]
		arrayTester.test([Promise.reject(errors[0]), Promise.reject(errors[1])], function (input, source, raceWinner) {
			var p = Promise.resolve(input).filter(returnsTrue)
			return expect(p).to.be.rejectedWith(errors[raceWinner])
		})
	})
	describe('should handle each style of callback correctly', function () {
		specify('callbacks returning values', function () {
			return expectABC(function (val) {
				return val !== 'b'
			}).to.eventually.satisfy(shallowEquals(['a', 'c']))
		})
		specify('callbacks returning already fulfilled promises', function () {
			return expectABC(function (val) {
				return Promise.resolve(val !== 'b')
			}).to.eventually.satisfy(shallowEquals(['a', 'c']))
		})
		specify('callbacks returning immediately fulfilled promises', function () {
			return expectABC(function (val) {
				return new Promise(function (res) {
					res(val !== 'b')
				})
			}).to.eventually.satisfy(shallowEquals(['a', 'c']))
		})
		specify('callbacks returning eventually fulfilled promises', function () {
			return expectABC(function (val) {
				return new Promise(function (res) {
					setTimeout(function () {
						res(val !== 'b')
					}, 1)
				})
			}).to.eventually.satisfy(shallowEquals(['a', 'c']))
		})
		specify('callbacks throwing exceptions', function () {
			var err = new Error('foobar')
			return expectABC(function (val) {
				if (val === 'b') {
					throw err
				}
				return true
			}).to.be.rejectedWith(err)
		})
		specify('callbacks returning already rejected promises', function () {
			var err = new Error('foobar')
			return expectABC(function (val) {
				return val === 'b' ? Promise.reject(err) : true
			}).to.be.rejectedWith(err)
		})
		specify('callbacks returning immediately rejected promises', function () {
			var err = new Error('foobar')
			return expectABC(function (val) {
				return val !== 'b' ? true : new Promise(function (res, rej) {
					rej(err)
				})
			}).to.be.rejectedWith(err)
		})
		specify('callbacks returning eventually rejected promises', function () {
			var err = new Error('foobar')
			return expectABC(function (val) {
				return val !== 'b' ? true : new Promise(function (res, rej) {
					setTimeout(function () {
						rej(err)
					}, 1)
				})
			}).to.be.rejectedWith(err)
		})
		specify('callbacks returning synchronously fulfilled thenables', function () {
			return expectABC(function (val) {
				return new Thenable().resolve(val !== 'b')
			}).to.eventually.satisfy(shallowEquals(['a', 'c']))
		})
		specify('callbacks returning asynchronously fulfilled thenables', function () {
			return expectABC(function (val) {
				return new Thenable({async: 50}).resolve(val !== 'b')
			}).to.eventually.satisfy(shallowEquals(['a', 'c']))
		})
		specify('callbacks returning synchronously rejected thenables', function () {
			var err = new Error('foobar')
			return expectABC(function (val) {
				return val !== 'b' ? true : new Thenable().reject(err)
			}).to.be.rejectedWith(err)
		})
		specify('callbacks returning asynchronously rejected thenables', function () {
			var err = new Error('foobar')
			return expectABC(function (val) {
				return val !== 'b' ? true : new Thenable({async: 50}).reject(err)
			}).to.be.rejectedWith(err)
		})
		specify('callbacks returning non-boolean values', function () {
			return expectABC(function (val) {
				return val !== 'b' ? {} : ''
			}).to.eventually.satisfy(shallowEquals(['a', 'c']))
		})
		specify('callbacks returning eventual non-boolean promises', function () {
			return expectABC(function (val) {
				return new Promise(function (res) {
					setTimeout(function () {
						res(val !== 'b' ? {} : '')
					}, 1)
				})
			}).to.eventually.satisfy(shallowEquals(['a', 'c']))
		})
	})
	describe('should not be affected by changing the input array from inside a callback', function () {
		specify('input array', function () {
			arrayTester.test(['foo', ''], function (input, source) {
				return expect(Promise.resolve(input).filter(function () {
					input[0] = 'x'
					input[1] = 'y'
					input[2] = 'z'
					return true
				})).to.eventually.satisfy(shallowEquals(['foo', '']))
			})
		})
		specify('input iterable', function () {
			arrayTester.test(['foo', ''], function (input, source) {
				return expect(Promise.resolve(makeIterable(input)).filter(function () {
					input[0] = 'x'
					input[1] = 'y'
					input[2] = 'z'
					return true
				})).to.eventually.satisfy(shallowEquals(['foo', '']))
			})
		})
	})
	describe('should use the context argument, if provided', function () {
		function testContext(ctx) {
			var p = Promise.resolve(['a', 'b', 'c'])
			var correctContext = 0
			function handler() {
				if (this === ctx) {++correctContext}
				return true
			}
			arguments.length > 0 ? (p = p.filter(handler, ctx))
			                     : (p = p.filter(handler))
			return p.then(function (result) {
				expect(correctContext).to.equal(3)
				expect(result).to.satisfy(shallowEquals(['a', 'b', 'c']))
			})
		}
		specify('undefined', function () {
			return testContext()
		})
		specify('null', function () {
			return testContext(null)
		})
		specify('object', function () {
			return testContext({})
		})
	})
})
