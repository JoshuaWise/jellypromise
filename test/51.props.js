'use strict'
var ObjectTester = require('../tools/test/object-tester')
var shallowEquals = require('../tools/test/object-shallow-equals')
require('../tools/test/describe')('Promise.props', function (Promise, expect) {
	var objectTester = new ObjectTester(Promise)
	function expectToMatch(input, source) {
		return expect(Promise.props(input)).to.eventually.satisfy(shallowEquals(source))
	}
	
	it('should be fulfilled given an empty object', function () {
		var obj = {}
		return expectToMatch(obj, obj)
	})
	it('should not treat arrays in a special way', function () {
		var array = new Array(3)
		array[1] = 'foo'
		return expectToMatch(array, {1: 'foo'})
	})
	it('should not treat functions in a special way', function () {
		var fn = function () {}
		fn.foo = 'bar'
		return expectToMatch(fn, {foo: 'bar'})
	})
	it('should not treat null-prototype objects in a special way', function () {
		var obj = Object.create(null)
		obj.foo = 'bar'
		return expectToMatch(obj, {foo: 'bar'})
	})
	describe('should be rejected on invalid input', function () {
		function testInvalidInput(value) {
			specify('given: ' + String(value), function () {
				return expect(Promise.props(value)).to.be.rejectedWith(TypeError)
			})
		}
		testInvalidInput(undefined)
		testInvalidInput(null)
		testInvalidInput(0)
		testInvalidInput(123)
		testInvalidInput(NaN)
		testInvalidInput(Infinity)
		testInvalidInput(true)
		testInvalidInput(false)
		testInvalidInput('foo')
		if (typeof Symbol === 'function') {
			testInvalidInput(Symbol())
		}
	})
	it('should only access each key\'s value once')
	// describe('should be fulfilled with an array of values', function () {
	// 	var irrelevantPromise = Promise.reject(new Error('baz')).catchLater()
	// 	arrayTester.test([[irrelevantPromise], 123], expectToMatch)
	// })
	// describe('should not be affected by changing the input array after invocation', function () {
	// 	arrayTester.test(['foo', ''], function (input, source) {
	// 		var ret = Promise.all(input)
	// 		input[0] = 'bar'
	// 		delete input[1]
	// 		input.length = 1
	// 		return expect(ret).to.eventually.satisfy(shallowEquals(['foo', '']))
	// 	})
	// })
	// describe('should not be affected by changing the input iterable after invocation', function () {
	// 	arrayTester.test(['foo', ''], function (input, source) {
	// 		var ret = Promise.all(makeIterable(input))
	// 		input[0] = 'bar'
	// 		delete input[1]
	// 		input.length = 1
	// 		return expect(ret).to.eventually.satisfy(shallowEquals(['foo', '']))
	// 	})
	// })
	// describe('should be rejected with the rejection reason of a rejected promise', function () {
	// 	var err = new Error('baz')
	// 	arrayTester.test([123, Promise.reject(err)], function (input, source) {
	// 		return expect(Promise.all(input)).to.be.rejectedWith(err)
	// 	})
	// })
	// describe('should be rejected by the first rejected promise', function () {
	// 	var errors = [new Error('baz'), new Error('quux')]
	// 	arrayTester.test([Promise.reject(errors[0]), Promise.reject(errors[1])], function (input, source, raceWinner) {
	// 		return expect(Promise.all(input)).to.be.rejectedWith(errors[raceWinner])
	// 	})
	// })
})
