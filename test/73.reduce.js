'use strict'
var ArrayTester = require('../tools/test/array-tester')
var Thenable = require('../tools/test/thenable')
var shallowEquals = require('../tools/test/shallow-equals')
var makeIterable = require('../tools/test/make-iterable')
var testNonIterables = require('../tools/test/test-non-iterables')
var testNonFunctions = require('../tools/test/test-non-functions')
require('../tools/test/describe')('.reduce', function (Promise, expect) {
	function sum(array) {
		var result = array[0]
		for (var i=1, len=array.length; i<len; i++) {
			result += array[i]
		}
		return result
	}
	var arrayTester = new ArrayTester(Promise)
	function returnsSum(a, b, i, len) {return a + b}
	function expectToSum(input, source) {
		var callbackValuesA = new Array(source.length - 1)
		var callbackValuesB = new Array(source.length - 1)
		var lenAlwaysCorrect = true
		var indexAlwaysCorrect = true
		if (useIterable) {
			useIterable = false
			input = makeIterable(input)
		}
		currentInputPromise = Promise.resolve(input)
		var index = 1
		return currentInputPromise.reduce(function (a, b, i, len) {
			if (len !== source.length) {
				lenAlwaysCorrect = false
			}
			if (i !== index++) {
				indexAlwaysCorrect = false
			}
			callbackValuesA.push(a)
			callbackValuesB.push(b)
			return a + b
		}).then(function (result) {
			expect(lenAlwaysCorrect).to.be.true
			expect(indexAlwaysCorrect).to.be.true
			expect(result).to.equal(sum(source))
			expect(callbackValuesA).to.satisfy(shallowEquals(sources.slice(0, -1)))
			expect(callbackValuesB).to.satisfy(shallowEquals(sources.slice(1)))
		})
	}
	var currentInputPromise = null // Use only synchronously after invoking expectToSum().
	var useIterable = false // Use only synchronously before invoking expectToSum().
	
	function expectABC(fn) {
		return expect(Promise.resolve(['a', 'b', 'c']).reduce(fn))
	}
	
	it('should be ignored given a rejected promise', function () {
		var array = [123, 456, 789]
		var neverInvoked = true
		var p = Promise.reject(array).reduce(function (a, b, i, len) {
			neverInvoked = false
		})
		return p.then(function () {
			throw new Error('This promise should have been rejected.')
		}, function (reason) {
			expect(reason).to.equal(array)
			expect(neverInvoked).to.be.true
		})
	})
	it('should be rejected given an empty array', function () {
		return expect(Promise.resolve([]).reduce(returnsSum))
			.to.be.rejectedWith(TypeError)
	})
	it('should treat deleted keys as undefined', function () {
		var array = new Array(3)
		array[0] = ''
		return expectToSum(array, array)
	})
	it('should treat strings as iterables, if ES6 iterables are supported', function () {
		if (typeof Symbol !== 'function' || !Symbol.iterator) {
			var p = Promise.resolve('hello').reduce(returnsSum)
			return expect(p).to.be.rejectedWith(TypeError)
		}
		return expectToSum('hello', ['h', 'e', 'l', 'l', 'o'])
	})
	describe('should be rejected on invalid input', function () {
		testNonIterables(function (value) {
			var p = Promise.resolve(value).reduce(returnsSum)
			return expect(p).to.be.rejectedWith(TypeError)
		})
	})
	describe('should be rejected when not given a callback function', function () {
		testNonFunctions(function (value) {
			var p = Promise.resolve(['a', 'b', 'c']).reduce(value)
			return expect(p).to.be.rejectedWith(TypeError)
		})
		specify('given: no arguments', function () {
			var p = Promise.resolve(['a', 'b', 'c']).reduce()
			return expect(p).to.be.rejectedWith(TypeError)
		})
	})
	describe('should be fulfilled with the value of single-item arrays', function () {
		specify('synchronous single value', function () {
			return expect(Promise.resolve(['q']).reduce(function (a, b, i, len) {
				throw new Error('This callback should not have been invoked.')
			})).to.become('q')
		})
		specify('synchronous single seed', function () {
			return expect(Promise.resolve([]).reduce(function (a, b, i, len) {
				throw new Error('This callback should not have been invoked.')
			}, 'q')).to.become('q')
		})
		specify('asynchronous single value', function () {
			var input = [
				new Promise(function (res) {
					setTimeout(function () {res('q')}, 50)
				})
			]
			return expect(Promise.resolve(input).reduce(function (a, b, i, len) {
				throw new Error('This callback should not have been invoked.')
			})).to.become('q')
		})
		specify('asynchronous single seed', function () {
			var seed = new Promise(function (res) {
				setTimeout(function () {res('q')}, 50)
			})
			return expect(Promise.resolve([]).reduce(function (a, b, i, len) {
				throw new Error('This callback should not have been invoked.')
			}, seed)).to.become('q')
		})
	})
	describe('should be rejected with the rejection reason of single-item arrays', function () {
		specify('synchronous single rejected promise', function () {
			var err = new Error('foobarbaz')
			return expect(Promise.resolve([Promise.reject(err)]).reduce(function (a, b, i, len) {
				throw new Error('This callback should not have been invoked.')
			})).to.be.rejectedWith(err)
		})
		specify('synchronous single rejected promise seed', function () {
			var err = new Error('foobarbaz')
			return expect(Promise.resolve([]).reduce(function (a, b, i, len) {
				throw new Error('This callback should not have been invoked.')
			}, Promise.reject(err))).to.be.rejectedWith(err)
		})
		specify('asynchronous single rejected promise', function () {
			var err = new Error('foobarbaz')
			var input = [
				new Promise(function (res, rej) {
					setTimeout(function () {rej(err)}, 50)
				})
			]
			return expect(Promise.resolve(input).reduce(function (a, b, i, len) {
				throw new Error('This callback should not have been invoked.')
			})).to.be.rejectedWith(err)
		})
		specify('asynchronous single rejected promise seed', function () {
			var err = new Error('foobarbaz')
			var seed = new Promise(function (res, rej) {
				setTimeout(function () {rej(err)}, 50)
			})
			return expect(Promise.resolve([]).reduce(function (a, b, i, len) {
				throw new Error('This callback should not have been invoked.')
			}, seed)).to.be.rejectedWith(err)
		})
	})
	describe('should be fulfilled with a sum of values', function () {
		var irrelevantPromise = Promise.reject(new Error('baz')).catchLater()
		arrayTester.test(['foo', [irrelevantPromise], 123], expectToSum)
	})
	describe('should not be affected by changing the input array after its fulfillment', function () {
		arrayTester.test(['foo', '', 'baz'], function (input, source) {
			var ret = expectToSum(input, source)
			currentInputPromise.then(function (array) {
				array[0] = 'bar'
				delete array[1]
				delete array[2]
				array.length = 1
			})
			return ret
		})
	})
	describe('should not be affected by changing the input iterable after its fulfillment', function () {
		arrayTester.test(['foo', '', 'baz'], function (input, source) {
			useIterable = true
			var ret = expectToSum(input, source)
			currentInputPromise.then(function (array) {
				array[0] = 'bar'
				delete array[1]
				delete array[2]
				array.length = 1
			})
			return ret
		})
	})
	describe('should be rejected when the input array contains a rejected promise', function () {
		var err = new Error('baz')
		arrayTester.test([123, 77, Promise.reject(err)], function (input, source) {
			var sum = 0
			var p = Promise.resolve(input).reduce(function (a, b) {
				sum += a + b
			})
			return p.then(function () {
				throw new Error('This promise should have been rejected.')
			}, function (reason) {
				expect(reason).to.equal(err)
				expect(sum).to.equal(200)
			})
		})
	})
	describe('should be rejected by the input array\'s first rejected promise', function () {
		var errors = [new Error('baz'), new Error('quux'), new Error('tron')]
		var input = [Promise.reject(errors[0]), Promise.reject(errors[1]), Promise.reject(errors[2])]
		arrayTester.test(input, function (input, source, raceWinner) {
			var p = Promise.resolve(input).reduce(returnsSum)
			return expect(p).to.be.rejectedWith(errors[0])
		})
	})
	// Everything below has not been done yet
	describe('should handle each style of callback correctly', function () {
		specify('callbacks returning values', function () {
			return expectABC(function (val) {
				return Math.random()
			}).to.eventually.satisfy(shallowEquals(['a', 'b', 'c']))
		})
		specify('callbacks returning already fulfilled promises', function () {
			return expectABC(function (val) {
				return Promise.resolve(Math.random())
			}).to.eventually.satisfy(shallowEquals(['a', 'b', 'c']))
		})
		specify('callbacks returning immediately fulfilled promises', function () {
			return expectABC(function (val) {
				return new Promise(function (res) {
					res(Math.random())
				})
			}).to.eventually.satisfy(shallowEquals(['a', 'b', 'c']))
		})
		specify('callbacks returning eventually fulfilled promises', function () {
			var source = ['a', 'b', 'c']
			var t0 = (new Date).getTime()
			return Promise.resolve(source).forEach(function (val) {
				return new Promise(function (res) {
					setTimeout(function () {
						res(Math.random())
					}, 200)
				})
			}).then(function (value) {
				expect(shallowEquals(source)(value)).to.be.true
				expect((new Date).getTime() - t0).to.be.within(180, 260)
			})
		})
		specify('callbacks throwing exceptions', function () {
			var err = new Error('foobar')
			return expectABC(function (val) {
				if (val === 'b') {
					throw err
				}
				return Math.random()
			}).to.be.rejectedWith(err)
		})
		specify('callbacks returning already rejected promises', function () {
			var err = new Error('foobar')
			return expectABC(function (val) {
				return val === 'b' ? Promise.reject(err) : Math.random()
			}).to.be.rejectedWith(err)
		})
		specify('callbacks returning immediately rejected promises', function () {
			var err = new Error('foobar')
			return expectABC(function (val) {
				return val !== 'b' ? Math.random() : new Promise(function (res, rej) {
					rej(err)
				})
			}).to.be.rejectedWith(err)
		})
		specify('callbacks returning eventually rejected promises', function () {
			var err = new Error('foobar')
			var t0 = (new Date).getTime()
			return Promise.resolve(['a', 'b', 'c']).forEach(function (val) {
				return val !== 'b' ? Math.random() : new Promise(function (res, rej) {
					setTimeout(function () {
						rej(err)
					}, 200)
				})
			}).then(function (value) {
				throw new Error('This promise should have been rejected.')
			}, function (reason) {
				expect(reason).to.equal(err)
				expect((new Date).getTime() - t0).to.be.within(180, 260)
			})
		})
		specify('callbacks returning synchronously fulfilled thenables', function () {
			return expectABC(function (val) {
				return new Thenable().resolve(Math.random())
			}).to.eventually.satisfy(shallowEquals(['a', 'b', 'c']))
		})
		specify('callbacks returning asynchronously fulfilled thenables', function () {
			return expectABC(function (val) {
				return new Thenable({async: 50}).resolve(Math.random())
			}).to.eventually.satisfy(shallowEquals(['a', 'b', 'c']))
		})
		specify('callbacks returning synchronously rejected thenables', function () {
			var err = new Error('foobar')
			return expectABC(function (val) {
				return val !== 'b' ? Math.random() : new Thenable().reject(err)
			}).to.be.rejectedWith(err)
		})
		specify('callbacks returning asynchronously rejected thenables', function () {
			var err = new Error('foobar')
			return expectABC(function (val) {
				return val !== 'b' ? Math.random() : new Thenable({async: 50}).reject(err)
			}).to.be.rejectedWith(err)
		})
	})
	describe('should not be affected by changing the input array from inside a callback', function () {
		specify('input array', function () {
			arrayTester.test(['foo', ''], function (input, source) {
				return expect(Promise.resolve(input).forEach(function (val) {
					input[0] = 'x'
					input[1] = 'y'
					input[2] = 'z'
					return val + '1'
				})).to.eventually.satisfy(shallowEquals(['foo', '']))
			})
		})
		specify('input iterable', function () {
			arrayTester.test(['foo', ''], function (input, source) {
				return expect(Promise.resolve(makeIterable(input)).forEach(function (val) {
					input[0] = 'x'
					input[1] = 'y'
					input[2] = 'z'
					return val + '1'
				})).to.eventually.satisfy(shallowEquals(['foo', '']))
			})
		})
	})
})
