'use strict'
// var ArrayTester = require('../tools/test/array-tester')
// var makeIterable = require('../tools/test/make-iterable')
var shallowEquals = require('../tools/test/shallow-equals')
var testNonIterables = require('../tools/test/test-non-iterables')
var testNonFunctions = require('../tools/test/test-non-functions')
require('../tools/test/describe')('Promise.iterate', function (Promise, expect) {
	// var arrayTester = new ArrayTester(Promise)
	var noop = function () {}
	
	it('should be fulfilled when given an empty array', function () {
		return expect(Promise.iterate([], noop)).to.become(undefined)
	})
	it('should treat deleted keys as undefined', function () {
		var array = ['a', 'b', 'c']
		delete array[0]
		delete array[2]
		var results = []
		return expect(
			Promise.iterate(array, function (value) {
				results.push(value)
			}).then(function () {return results})
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
	it('should be affected by changing the input array after invocation', function () {
		var array = ['a', 'b', 'c']
		var results = []
		var expectation = expect(
			Promise.iterate(array, function (value) {
				if (value === 'a') {array[2] = 'id'}
				results.push(value)
			})
			.then(function () {return results.join('')})
		)
		array[1] = 'c'
		return expectation.to.become('acid')
	})
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
	it('should only access array indexes one at a time, after each value fulfills')
	it('should be tested for actual functonality')
})
