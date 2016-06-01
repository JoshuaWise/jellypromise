'use strict'
// var ArrayTester = require('../tools/array-tester')
// var makeIterable = require('../tools/make-iterable')
var testNonIterables = require('../tools/test-non-iterables')
require('../tools/describe')('Promise.race', function (Promise, expect) {
	// var arrayTester = new ArrayTester(Promise)
	
	describe('should be rejected on invalid input', function () {
		testNonIterables(function (value) {
			return expect(Promise.race(value)).to.be.rejectedWith(TypeError)
		})
	})
	it('should never be resolved when given an empty array', function (done) {
		var called = false
		function doneOnce(err) {
			if (!called) {
				called = true
				done(err)
			}
		}
		Promise.race([]).then(function () {
			doneOnce(new Error('This promise should not have been resolved.'))
		}, doneOnce)
		setTimeout(doneOnce, 100)
	})
	it('from an array of values, should be fulfilled with the first value', function () {
		return expect(Promise.race(['abc', 123, 'xyz'])).to.become('abc')
	})
	it('from an array of settled promises, should resolve with the first (fulfill)', function () {
		var input = [Promise.resolve(123), Promise.reject(new Error('foo')), Promise.resolve('xyz')]
		return expect(Promise.race(input)).to.become(123)
	})
	it('from an array of settled promises, should resolve with the first (reject)', function () {
		var err = new Error('foo')
		var input = [Promise.reject(err), Promise.resolve(123), Promise.resolve(new Error('not this one'))]
		return expect(Promise.race(input)).to.be.rejectedWith(err)
	})
	it('from an array of values and promises, should be fulfilled with the first value or already fulfilled/rejected promise', function () {
		function delayed() {
			return new Promise(function (res, rej) {
				setTimeout(function () {res(555)}, 1)
			})
		}
		var err = new Error('foo')
		return Promise.all([
			expect(Promise.race([
				delayed(), 123, Promise.resolve('abc'), Promise.reject(new Error('not this one'))
			])).to.become(123),
			expect(Promise.race([
				delayed(), Promise.resolve('abc'), 123, Promise.reject(new Error('not this one'))
			])).to.become('abc'),
			expect(Promise.race([
				delayed(), Promise.reject(err), 123, Promise.resolve('abc')
			])).to.be.rejectedWith(err),
			expect(Promise.race([
				123, Promise.resolve('abc'), Promise.reject(new Error('not this one'))
			])).to.become(123),
			expect(Promise.race([
				Promise.resolve('abc'), 123, 'xyz'
			])).to.become('abc'),
			expect(Promise.race([
				Promise.reject(err), 123, 'xyz'
			])).to.be.rejectedWith(err)
		])
	})
	it('from a sparse array of values and promises, should be fulfilled with the first value or already fulfilled/rejected promise', function () {
		function delayed() {
			return new Promise(function (res, rej) {
				setTimeout(function () {res(555)}, 1)
			})
		}
		var err = new Error('foo')
		var input1 = [delayed(), Promise.resolve('abc'), 123, Promise.reject(new Error('not this one'))]
		var input2 = [delayed(), Promise.reject(err), 123, Promise.resolve('abc')]
		delete input1[1]
		delete input2[2]
		input2[50] = 'foobar'
		return Promise.all([
			expect(Promise.race(input1)).to.become(undefined),
			expect(Promise.race(input2)).to.be.rejectedWith(err)
		])
	})
	it('should not be affected by changing the input array after invocation', function () {
		var err = new Error('foo')
		var delayed = new Promise(function (res, rej) {
			setTimeout(function () {res(555)}, 1)
		})
		var input1 = ['a', 'b', 'c']
		var input2 = [Promise.resolve('a'), Promise.resolve('b'), Promise.resolve('c')]
		var input3 = [Promise.reject(err), 'b', 'c']
		var input4 = [delayed]
		var ret1 = Promise.race(input1)
		var ret2 = Promise.race(input2)
		var ret3 = Promise.race(input3)
		var ret4 = Promise.race(input4)
		input1[0] = 'z'
		input2[1] = 'z'
		input3[0] = 'z'
		input4[0] = 'z'
		return Promise.all([
			expect(ret1).to.become('a'),
			expect(ret2).to.become('a'),
			expect(ret3).to.be.rejectedWith(err),
			expect(ret4).to.become(555)
		])
	})
	it('should test being given foreign thenables')
})
