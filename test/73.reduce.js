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
		var callbackValuesB = []
		var lenAlwaysCorrect = true
		var indexAlwaysCorrect = true
		var aAlwaysCorrect = true
		var lastReturnValue
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
			if (i === 1 && a !== source[0]) {
				aAlwaysCorrect = false
			}
			if (i !== 1 && a !== lastReturnValue) {
				aAlwaysCorrect = false
			}
			callbackValuesB.push(b)
			return lastReturnValue = a + b
		}).then(function (result) {
			expect(lenAlwaysCorrect).to.be.true
			expect(indexAlwaysCorrect).to.be.true
			expect(aAlwaysCorrect).to.be.true
			expect(result).to.equal(sum(source))
			expect(callbackValuesB).to.satisfy(shallowEquals(source.slice(1)))
		})
	}
	var currentInputPromise = null // Use only synchronously after invoking expectToSum().
	var useIterable = false // Use only synchronously before invoking expectToSum().
	
	function expectABCD(fn) {
		return expect(Promise.resolve(['a', 'b', 'c', 'd']).reduce(fn))
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
			var err = new Error('blahhhh')
			return expect(Promise.resolve([Promise.reject(err).catchLater()]).reduce(function (a, b, i, len) {
				throw new Error('This callback should not have been invoked.')
			})).to.be.rejectedWith(err)
		})
		specify('synchronous single rejected promise seed', function () {
			var err = new Error('blahhhh')
			return expect(Promise.resolve([]).reduce(function (a, b, i, len) {
				throw new Error('This callback should not have been invoked.')
			}, Promise.reject(err).catchLater())).to.be.rejectedWith(err)
		})
		specify('asynchronous single rejected promise', function () {
			var err = new Error('blahhhh')
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
			var err = new Error('blahhhh')
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
		var err = new Error('baz')
		var input = [Promise.reject(err), Promise.reject(new Error('quux')), Promise.reject(new Error('tron'))]
		arrayTester.test(input, function (input, source, raceWinner) {
			var p = Promise.resolve(input).reduce(returnsSum)
			return expect(p).to.be.rejectedWith(err)
		})
	})
	describe('should handle each style of callback correctly', function () {
		specify('callbacks returning values', function () {
			return expectABCD(function (a, b) {
				return a + b
			}).to.become('abcd')
		})
		specify('callbacks returning already fulfilled promises', function () {
			return expectABCD(function (a, b) {
				return Promise.resolve(a + b)
			}).to.become('abcd')
		})
		specify('callbacks returning immediately fulfilled promises', function () {
			return expectABCD(function (a, b) {
				return new Promise(function (res) {
					res(a + b)
				})
			}).to.become('abcd')
		})
		specify('callbacks returning eventually fulfilled promises', function () {
			return expectABCD(function (a, b) {
				return new Promise(function (res) {
					setTimeout(function () {
						res(a + b)
					}, 1)
				})
			}).to.become('abcd')
		})
		specify('callbacks throwing exceptions', function () {
			var err = new Error('foobar')
			return expectABCD(function (a, b) {
				if (b === 'c') {
					throw err
				}
				return a + b
			}).to.be.rejectedWith(err)
		})
		specify('callbacks returning already rejected promises', function () {
			var err = new Error('foobar')
			return expectABCD(function (a, b) {
				return b === 'c' ? Promise.reject(err) : a + b
			}).to.be.rejectedWith(err)
		})
		specify('callbacks returning immediately rejected promises', function () {
			var err = new Error('foobar')
			return expectABCD(function (a, b) {
				return b !== 'c' ? a + b : new Promise(function (res, rej) {
					rej(err)
				})
			}).to.be.rejectedWith(err)
		})
		specify('callbacks returning eventually rejected promises', function () {
			var err = new Error('foobar')
			return expectABCD(function (a, b) {
				return b !== 'c' ? a + b : new Promise(function (res, rej) {
					setTimeout(function () {
						rej(err)
					}, 1)
				})
			}).to.be.rejectedWith(err)
		})
		specify('callbacks returning synchronously fulfilled thenables', function () {
			return expectABCD(function (a, b) {
				return new Thenable().resolve(a + b)
			}).to.become('abcd')
		})
		specify('callbacks returning asynchronously fulfilled thenables', function () {
			return expectABCD(function (a, b) {
				return new Thenable({async: 50}).resolve(a + b)
			}).to.become('abcd')
		})
		specify('callbacks returning synchronously rejected thenables', function () {
			var err = new Error('foobar')
			return expectABCD(function (a, b) {
				return b !== 'c' ? a + b : new Thenable().reject(err)
			}).to.be.rejectedWith(err)
		})
		specify('callbacks returning asynchronously rejected thenables', function () {
			var err = new Error('foobar')
			return expectABCD(function (a, b) {
				return b !== 'c' ? a + b : new Thenable({async: 50}).reject(err)
			}).to.be.rejectedWith(err)
		})
	})
	describe('should not be affected by changing the input from inside a callback', function () {
		specify('input array', function () {
			arrayTester.test(['foo', 'bar', 'baz'], function (input, source) {
				return expect(Promise.resolve(input).reduce(function (a, b) {
					input[0] = 'w'
					input[1] = 'x'
					input[2] = 'y'
					input[3] = 'z'
					return a + b
				})).to.become('foobarbaz')
			})
		})
		specify('input iterable', function () {
			arrayTester.test(['foo', 'bar', 'baz'], function (input, source) {
				return expect(Promise.resolve(makeIterable(input)).reduce(function (a, b) {
					input[0] = 'w'
					input[1] = 'x'
					input[2] = 'y'
					input[3] = 'z'
					return a + b
				})).to.become('foobarbaz')
			})
		})
	})
	describe('should invoke catchLater() on each passed promise', function () {
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
		specify('input array', function (done) {
			var err = new Error('blahhhh')
			var logged = false
			var cancel = hookConsole(function () {logged = true})
			Promise.resolve([
				new Promise(function (res) {
					setTimeout(function () {res('a')}, 50)
				}),
				new Promise(function (res) {
					setTimeout(function () {res('b')}, 100)
				}),
				new Promise(function (res) {
					setTimeout(function () {res('c')}, 150)
				}),
				new Promise(function (res, rej) {
					setTimeout(function () {rej(err)}, 1)
				})
			]).filter(returnsSum).then(function () {
				cancel()
				done(new Error('This promise should have been rejected.'))
			}, function (reason) {
				cancel()
				if (logged) {
					done(new Error('Unhandled rejection logging should have been supressed.'))
					return
				}
				if (reason !== err) {
					done(new Error('Expected rejection reason to be a different error object.'))
					return
				}
				done()
			})
		})
		specify('input iterable', function (done) {
			var err = new Error('blahhhh')
			var logged = false
			var cancel = hookConsole(function () {logged = true})
			Promise.resolve(makeIterable([
				new Promise(function (res) {
					setTimeout(function () {res('a')}, 50)
				}),
				new Promise(function (res) {
					setTimeout(function () {res('b')}, 100)
				}),
				new Promise(function (res) {
					setTimeout(function () {res('c')}, 150)
				}),
				new Promise(function (res, rej) {
					setTimeout(function () {rej(err)}, 1)
				})
			])).filter(returnsSum).then(function () {
				cancel()
				done(new Error('This promise should have been rejected.'))
			}, function (reason) {
				cancel()
				if (logged) {
					done(new Error('Unhandled rejection logging should have been supressed.'))
					return
				}
				if (reason !== err) {
					done(new Error('Expected rejection reason to be a different error object.'))
					return
				}
				done()
			})
		})
	})
	describe('should use seed argument, if provided', function () {
		function expectToSumSeed(input, source, seed, seedValue) {
			var callbackValuesB = []
			var lenAlwaysCorrect = true
			var indexAlwaysCorrect = true
			var aAlwaysCorrect = true
			var lastReturnValue
			if (useIterable) {
				useIterable = false
				input = makeIterable(input)
			}
			currentInputPromise = Promise.resolve(input)
			var index = 0
			return currentInputPromise.reduce(function (a, b, i, len) {
				if (len !== source.length) {
					lenAlwaysCorrect = false
				}
				if (i !== index++) {
					indexAlwaysCorrect = false
				}
				if (i === 0 && a !== seedValue) {
					aAlwaysCorrect = false
				}
				if (i !== 0 && a !== lastReturnValue) {
					aAlwaysCorrect = false
				}
				callbackValuesB.push(b)
				return lastReturnValue = a + b
			}, seed).then(function (result) {
				expect(lenAlwaysCorrect).to.be.true
				expect(indexAlwaysCorrect).to.be.true
				expect(aAlwaysCorrect).to.be.true
				expect(result).to.equal(sum([seedValue].concat(source)))
				expect(callbackValuesB).to.satisfy(shallowEquals(source))
			})
		}
		it('should not change the input array when a seed is provided', function () {
			var input = ['a', Promise.resolve('b'), new Thenable({async: 50}).resolve('c')]
			return Promise.resolve(input).reduce(function (a, b) {
				return a + b
			}, new Thenable({async: 50}).resolve('z')).then(function (result) {
				expect(result).to.equal('zabc')
				expect(input.length).to.equal(3)
				expect(input[0]).to.equal('a')
			})
		})
		it('should accept seed values of undefined', function () {
			var input = ['a', Promise.resolve('b'), new Thenable({async: 50}).resolve('c')]
			return Promise.resolve(input).reduce(function (a, b) {
				return a + b
			}, undefined).then(function (result) {
				expect(result).to.equal('undefinedabc')
			})
		})
		describe('should be fulfilled with a sum of the seed and values', function () {
			arrayTester.test(['zzz', 'foo', 123], function (input, source) {
				return expectToSumSeed(input.slice(1), source.slice(1), input[0], source[0])
			})
		})
		describe('should be rejected when the seed is a rejected promise', function () {
			var err = new Error('baz')
			arrayTester.test([Promise.reject(new Error('foo')), 123], function (input, source) {
				var neverInvoked = true
				var p = Promise.resolve(input).reduce(function (a, b) {
					neverInvoked = false
				}, new Thenable({async: 50}).reject(err))
				return p.then(function () {
					throw new Error('This promise should have been rejected.')
				}, function (reason) {
					expect(reason).to.equal(err)
					expect(neverInvoked).to.be.true
				})
			})
		})
	})
})
