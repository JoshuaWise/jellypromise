'use strict'
// var ArrayTester = require('../tools/test/array-tester')
// var makeIterable = require('../tools/test/make-iterable')
var testNonIterables = require('../tools/test/test-non-iterables')
require('../tools/test/describe')('Promise.any', function (Promise, expect) {
	// var arrayTester = new ArrayTester(Promise)
	
	it('should be rejected when given an empty array', function () {
		return expect(Promise.any([])).to.be.rejected;
	})
	it('should treat deleted keys as undefined', function () {
		var array = ['a', 'b', 'c']
		delete array[0]
		return expect(Promise.any(array)).to.become(undefined)
	})
	it('should treat strings as iterables, if ES6 iterables are supported', function () {
		var expectation = expect(Promise.any('hello'))
		if (typeof Symbol !== 'function' || !Symbol.iterator) {
			return expectation.to.be.rejectedWith(TypeError)
		}
		return expectation.to.become('h')
	})
	describe('should be rejected on invalid input', function () {
		testNonIterables(function (value) {
			return expect(Promise.any(value)).to.be.rejectedWith(TypeError)
		})
	})
	it('should test actual functionality, similar to Promise.race')
})
