'use strict'
var ArrayTester = require('../tools/test/array-tester')
var shallowEquals = require('../tools/test/shallow-equals')
var makeIterable = require('../tools/test/make-iterable')
var testNonIterables = require('../tools/test/test-non-iterables')
require('../tools/test/describe')('Promise.all', function (Promise, expect) {
	var arrayTester = new ArrayTester(Promise)
	function expectToMatch(input, source) {
		return expect(Promise.all(input)).to.eventually.satisfy(shallowEquals(source))
	}
	
	describe('should be rejected on invalid input', function () {
		testNonIterables(function (value) {
			return expect(Promise.all(value)).to.be.rejectedWith(TypeError)
		})
	})
	it('should be fulfilled given an empty array', function () {
		return expect(Promise.all([])).to.eventually.satisfy(shallowEquals([]))
	})
	it('should treat deleted keys as undefined', function () {
		return expect(Promise.all(new Array(3))).to.eventually.satisfy(shallowEquals(new Array(3)))
	})
	it('should treat strings as iterables, if ES6 iterables are supported', function () {
		var expectation = expect(Promise.all('hello'))
		if (typeof Symbol !== 'function' || !Symbol.iterator) {
			return expectation.to.be.rejectedWith(TypeError)
		}
		return expectation.to.eventually.satisfy(shallowEquals(['h', 'e', 'l', 'l', 'o']))
	})
	it('should not be affected by changing the input array after invocation (1)', function () {
		var input = ['a', 'b', 'c']
		var ret = Promise.all(input)
		input[1] = 'z'
		return expect(ret).to.eventually.satisfy(shallowEquals(['a', 'b', 'c']))
	})
	it('should not be affected by changing the input array after invocation (2)', function () {
		var input = [Promise.resolve('a'), Promise.resolve('b'), 'c']
		var ret = Promise.all(input)
		input[0] = Promise.resolve('z')
		return expect(ret).to.eventually.satisfy(shallowEquals(['a', 'b', 'c']))
	})
	it('should not be affected by changing the input array after invocation (3)', function () {
		var input = [Promise.resolve('a'), Promise.resolve('b'), 'c']
		var ret = Promise.all(input)
		input[0] = Promise.reject(new Error('not this one')).catchLater()
		return expect(ret).to.eventually.satisfy(shallowEquals(['a', 'b', 'c']))
	})
	it('should not be affected by changing the input array after invocation (4)', function () {
		var err = new Error('foo')
		var input = ['a', Promise.reject(err), 'c']
		var ret = Promise.all(input)
		input[1] = 'z'
		return ret.then(function () {
			throw new Error('The promise should have been rejected.')
		}, function (reason) {
			if (reason !== err) {
				throw new Error('An incorrect rejection reason was used.')
			}
		})
	})
	it('should not be affected by changing the input array after invocation (5)', function () {
		var delayed = new Promise(function (res, rej) {
			setTimeout(function () {res(555)}, 1)
		})
		var input = [delayed, 'b', 'c']
		var ret = Promise.all(input)
		input[0] = 'z'
		return expect(ret).to.eventually.satisfy(shallowEquals([555, 'b', 'c']))
	})
	it('should not be affected by changing the input array after invocation (6)', function () {
		var input = ['a', 'b', 'c']
		var ret = Promise.all(makeIterable(input))
		input[1] = 'z'
		return expect(ret).to.eventually.satisfy(shallowEquals(['a', 'b', 'c']))
	})
	describe('should be fulfilled with an array of values (1)', function () {
		var arr = ['x', 'y']
		if (typeof Symbol === 'function') {
			arr[0] = Symbol()
		}
		arrayTester.test(arr, expectToMatch)
	})
	describe('should be fulfilled with an array of values (2)', function () {
		arrayTester.test([undefined, {}], expectToMatch)
	})
	describe('should be fulfilled with an array of values (3)', function () {
		var fn = function () {}
		arrayTester.test([fn, fn], expectToMatch)
	})
	describe('should be fulfilled with an array of values (4)', function () {
		var fn = function () {}
		arrayTester.test([[], NaN], expectToMatch)
	})
	describe('should be fulfilled with a sparse array of values', function () {
		var arr = ['a']
		delete arr[0]
		arr[1] = 'c'
		arr.length = 3
		arrayTester.test(arr, expectToMatch)
	})
	describe('should be rejected with the rejection reason of a rejected promise', function () {
		var err = new Error('baz')
		arrayTester.test([false, Promise.reject(err)], function (input, source) {
			return expect(Promise.all(input)).to.be.rejectedWith(err)
		})
	})
})
