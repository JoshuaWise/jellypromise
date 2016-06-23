'use strict'
var Thenable = require('../tools/test/thenable')
var makeIterable = require('../tools/test/make-iterable')
var shallowEquals = require('../tools/test/shallow-equals')
var testNonIterables = require('../tools/test/test-non-iterables')
var testNonFunctions = require('../tools/test/test-non-functions')
require('../tools/test/describe')('Promise.iterate', function (Promise, expect) {
	function returnResults(results) {
		return function (value) {
			expect(value).to.be.undefined
			return results
		}
	}
	function delayedPromise(value, ms) {
		return new Promise(function (res) {
			setTimeout(function () {res(value)}, ~~ms)
		})
	}
	function noop() {}
	
	it('should be fulfilled when given an empty array', function () {
		return expect(Promise.iterate([], noop)).to.become(undefined)
	})
	it('should invoke the callback for each item in the iterable', function () {
		var array = ['a', 'b', 'c']
		var results = []
		return expect(
			Promise.iterate(makeIterable(array), function (value) {
				results.push(value)
			})
			.then(returnResults(results))
		).to.eventually.satisfy(shallowEquals(array))
	})
	it('should treat deleted keys as undefined', function () {
		var array = ['a', 'b', 'c']
		delete array[0]
		delete array[2]
		var results = []
		return expect(
			Promise.iterate(array, function (value) {
				results.push(value)
			})
			.then(returnResults(results))
		).to.eventually.satisfy(shallowEquals(array))
	})
	it('should treat strings as iterables, if ES6 iterables are supported', function () {
		var results = []
		var expectation = expect(
			Promise.iterate('hello', function (value) {results.unshift(value)})
				.then(function () {return results.join('')})
		)
		if (typeof Symbol !== 'function' || !Symbol.iterator) {
			return expectation.to.be.rejectedWith(TypeError)
		}
		return expectation.to.become('olleh')
	})
	it('should wait for pending promises to fulfill before continuing', function (done) {
		var delayed
		var err = new Error('foo')
		var array = [delayedPromise('a', 100), 'b', 'c', 'd']
		var results = []
		Promise.iterate(array, function (value) {
			results.push(value)
			if (value === 'd') {
				done(new Error('Iteration should have stopped before reaching "d".'))
				return
			}
			if (value === 'b') {
				setTimeout(function () {
					array[2] = Promise.reject(err).catchLater()
				}, 50)
				return delayed = delayedPromise('x', 100)
			}
		}).then(function () {
			done(new Error('This promise should have been rejected.'))
		}, function (reason) {
			expect(reason).to.equal(err)
			expect(results).to.deep.equal(['a', 'b'])
			expect(delayed.inspect().state).to.equal('fulfilled')
			done()
		})
	})
	it('should be affected by changing the input array after invocation', function () {
		var array = ['a', 'b', 'c']
		var results = []
		var expectation = expect(
			Promise.iterate(array, function (value) {
				if (value === 'a') {array[2] = 'i'}
				if (value === 'd') {array[1] = 'x'}
				results.push(value)
			})
			.then(returnResults(results))
		)
		array[1] = 'c'
		Promise.resolve().then(function () {
			array.push('d')
		})
		return expectation.to.eventually.satisfy(shallowEquals(['a', 'c', 'i', 'd']))
	})
	it('should respect foreign thenables', function () {
		var err = new Error('foo')
		var array = [
			new Thenable({async: 100}).resolve('a'),
			new Thenable().resolve('b'),
			new Thenable({async: 30}).reject(err)
		]
		var results = []
		return Promise.iterate(array, function (value) {
			results.push(value)
		}).then(function () {
			throw new Error('This promise should have been rejected.')
		}, function (reason) {
			expect(reason).to.equal(err)
			expect(results).to.deep.equal(['a', 'b'])
		})
	})
	it('should be rejected if the callback throws', function (done) {
		var err = new Error('foo')
		var array = ['a', 'b', 'c', 'd']
		var results = []
		Promise.iterate(array, function (value) {
			if (value === 'd') {
				done(new Error('Iteration should have stopped before reaching "d".'))
				return
			}
			if (value === 'c') {
				throw err
			}
			results.push(value)
		}).then(function () {
			done(new Error('This promise should have been rejected.'))
		}, function (reason) {
			expect(reason).to.equal(err)
			expect(results).to.deep.equal(['a', 'b'])
			done()
		})
	})
	if (typeof Symbol === 'function' && Symbol.iterator) {
		it('should be rejected if the iterator throws', function (done) {
			var err = new Error('foo')
			var iterable = {}
			iterable[Symbol.iterator] = function () {
				var gaveOnce = false
				return {next: function () {
					if (!gaveOnce) {
						gaveOnce = true
						return {done: false, value: 'a'}
					}
					throw err
				}}
			}
			var results = []
			Promise.iterate(iterable, function (value) {
				if (results.length) {
					done(new Error('Iteration should have stopped before a second callback invocation.'))
					return
				}
				results.push(value)
			}).then(function () {
				done(new Error('This promise should have been rejected.'))
			}, function (reason) {
				expect(reason).to.equal(err)
				expect(results).to.deep.equal(['a'])
				done()
			})
		})
	}
	describe('should be rejected on invalid input', function () {
		testNonIterables(function (value) {
			return expect(Promise.iterate(value, noop)).to.be.rejectedWith(TypeError)
		})
	})
	describe('should be rejected when not given a callback function', function () {
		testNonFunctions(function (value) {
			return expect(Promise.iterate([], value)).to.be.rejectedWith(TypeError)
		})
		specify('given: no second argument', function () {
			return expect(Promise.iterate([])).to.be.rejectedWith(TypeError)
		})
	})
})
