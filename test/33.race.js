'use strict'
var ArrayTester = require('../tools/test/array-tester')
// var makeIterable = require('../tools/test/make-iterable')
var testNonIterables = require('../tools/test/test-non-iterables')
require('../tools/test/describe')('Promise.race', function (Promise, expect) {
	var arrayTester = new ArrayTester(Promise)
	
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
	describe('from an array, should be resolved with the first settled item (1)', function () {
		arrayTester.test(['foo', 4], function (input, source, indexOfFirst) {
			return expect(Promise.race(input)).to.become(source[indexOfFirst])
		})
	})
	describe('from an array, should be resolved with the first settled item (2)', function () {
		var err = new Error
		var p = Promise.reject(err)
		arrayTester.test(['foo', p], function (input, source, indexOfFirst) {
			return Promise.race(input).then(function (value) {
				expect(value).to.equal('foo')
				expect(value).to.equal(source[indexOfFirst])
			}, function (reason) {
				expect(reason).to.equal(err)
				expect(p).to.equal(source[indexOfFirst])
			})
		})
	})
	describe('from an array, should be resolved with the first settled item (3)', function () {
		var err = new Error
		var p = Promise.reject(err)
		arrayTester.test([p, 4], function (input, source, indexOfFirst) {
			return Promise.race(input).then(function (value) {
				expect(value).to.equal(4)
				expect(value).to.equal(source[indexOfFirst])
			}, function (reason) {
				expect(reason).to.equal(err)
				expect(p).to.equal(source[indexOfFirst])
			})
		})
	})
	describe('from a sparse array, should be resolved with the first settled item', function (input, source, indexOfFirst) {
		var arr = ['a', 'c']
		delete arr[0]
		return expect(Promise.race(arr)).to.become(undefined)
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
})
