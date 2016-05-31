'use strict'
var asap = require('asap/raw')
require('../tools/describe')('Promise.all', function (Promise, expect) {
	function isBaseArray(arr) {
		return arr instanceof Array && arr.__proto__ === Array.prototype
	}
	function shallowEquals(a) {
		return function (b) {
			if (a === b || !isBaseArray(b) || b.length !== a.length) {
				// Promise.all() never fulfills with the same array as the input.
				// Promise.all() always fulfills with base arrays.
				return false
			}
			for (var i=0, len=a.length; i<len; i++) {
				if (!(i in b)) {
					// Promise.all() fills deleted keys with undefined.
					return false
				}
				if (a[i] !== b[i] && (a === a || b === b)) {
					// NaN is considered equal to NaN in this case.
					return false
				}
			}
			return (i in b) === false
		}
	}
	function now(value, quality) {
		return Promise[quality === false ? 'reject' : 'resolve'](value)
	}
	function soon(value, quality) {
		return new Promise(function (res, rej) {
			setTimeout(function () {
				;[quality === false ? rej : res](value)
			}, 1)
		})
	}
	function testInvalidInput(value) {
		specify('given: ' + String(value), function () {
			return expect(Promise.all(value)).to.be.rejectedWith(TypeError)
		})
	}
	
	describe('should be rejected on invalid input', function () {
		testInvalidInput(undefined)
		testInvalidInput(null)
		testInvalidInput(0)
		testInvalidInput(123)
		testInvalidInput(true)
		testInvalidInput(false)
		testInvalidInput({})
		if (typeof Symbol === 'function') {
			testInvalidInput(Symbol())
		}
	})
	it('should be fulfilled given an empty array', function () {
		return expect(Promise.all([])).to.eventually.satisfy(shallowEquals(new Array(0)))
	})
	it('should treat deleted keys as undefined', function () {
		return expect(Promise.all(new Array(3))).to.eventually.satisfy(shallowEquals(new Array(3)))
	})
	
	// unsure of below
	
	it('should be fulfilled with an array of values', function () {
		var obj = {}
		return expect(Promise.all(['a', 123, 'z', obj])).to.eventually.satisfy(shallowEquals(['a', 123, 'z', obj]))
	})
	it('should be fulfilled with an array of promises', function () {
		var obj = {}
		return expect(Promise.all([
			Promise.resolve('b'), Promise.resolve(321), Promise.resolve('y'), Promise.resolve(obj)
		])).to.eventually.satisfy(shallowEquals(['b', 321, 'y', obj]))
	})
	it('should be fulfilled with an array of values and promises', function () {
		var obj = {}
		return expect(Promise.all([
			'c', 555, Promise.resolve('x'), obj
		])).to.eventually.be.an.instanceof(Array).and.satisfy(function (arr) {
			return arr[0] === 'c'
				&& arr[1] === 555
				&& arr[2] === 'x'
				&& arr[3] === obj
		})
	})
	it('should be fulfilled with a sparse array of values and promises', function () {
		var obj = {}
		var input = ['c', obj, Promise.resolve('x'), 555]
		delete input[0]
		delete input[3]
		input[80] = 'very high index'
		return expect(Promise.all(input)).to.eventually.be.an.instanceof(Array).and.satisfy(function (arr) {
			if (arr.length !== 81
				|| !(0 in arr) || arr[0] !== undefined
				|| !(1 in arr) || arr[1] !== obj
				|| !(2 in arr) || arr[2] !== 'x'
				|| !(3 in arr) || arr[3] !== undefined) {
				return false
			}
			for (var i=4; i<80; i++) {
				if (!(i in arr) || arr[i] !== undefined) {
					return false
				}
			}
			return 80 in arr && arr[80] === 'very high index'
		})
	})
	it('should be fulfilled with an iterable of values and promises', function () {
			var obj = {}
			return expect(Promise.all(makeIterable([
				'd', 999, Promise.resolve('w'), obj
			]))).to.eventually.be.an.instanceof(Array).and.satisfy(function (arr) {
				return arr[0] === 'd'
					&& arr[1] === 999
					&& arr[2] === 'w'
					&& arr[3] === obj
			})
		})
	it('should be rejected with the rejection reason of a rejected promise', function () {
		var err = new Error('This error should be the rejection reason')
		var input = ['e', Promise.resolve(111), Promise.reject(err), {}]
		return Promise.all(input).then(function () {
			throw new Error('Promise should have been rejected.')
		}, function (reason) {
			if (reason !== err) {
				throw new Error('Rejection reason is not the correct error object.')
			}
		})
	})
	it('should not be affected by changing the input array after invocation (1)', function () {
		var input = ['a', 'b', 'c']
		var ret = Promise.all(input)
		input[1] = 'z'
		return expect(ret).to.eventually.be.an.instanceof(Array).and.satisfy(function (arr) {
			return arr[0] === 'a' && arr[1] === 'b' && arr[2] === 'c'
		})
	})
	it('should not be affected by changing the input array after invocation (2)', function () {
		var input = [Promise.resolve('a'), Promise.resolve('b'), 'c']
		var ret = Promise.all(input)
		input[0] = Promise.resolve('z')
		return expect(ret).to.eventually.be.an.instanceof(Array).and.satisfy(function (arr) {
			return arr[0] === 'a' && arr[1] === 'b' && arr[2] === 'c'
		})
	})
	it('should not be affected by changing the input array after invocation (3)', function () {
		var input = [Promise.resolve('a'), Promise.resolve('b'), 'c']
		var ret = Promise.all(input)
		input[0] = Promise.reject(new Error('not this one')).catchLater()
		return expect(ret).to.eventually.be.an.instanceof(Array).and.satisfy(function (arr) {
			return arr[0] === 'a' && arr[1] === 'b' && arr[2] === 'c'
		})
	})
	it('should not be affected by changing the input array after invocation (4)', function () {
		var err = new Error('foo')
		var input = ['a', Promise.reject(err), 'c']
		var ret = Promise.all(input)
		input[1] = 'z'
		return ret.then(function () {
			throw new Error('The promise should have bee rejected.')
		}, function (reason) {
			if (reason !== err) {
				throw new Error('An incorrect rejection reason was used.')
			}
		})
	})
	it('should not be affected by changing the input array after invocation (5)', function () {
		var delayed = new Promise(function (res, rej) {
			asap(function () {res(555)})
		})
		var input = [delayed, 'b', 'c']
		var ret = Promise.all(input)
		input[0] = 'z'
		return expect(ret).to.eventually.be.an.instanceof(Array).and.satisfy(function (arr) {
			return arr[0] === 555 && arr[1] === 'b' && arr[2] === 'c'
		})
	})
	it('should not be affected by changing the input array after invocation (6)', function () {
		var input = ['a', 'b', 'c']
		var ret = Promise.all(makeIterable(input))
		input[1] = 'z'
		return expect(ret).to.eventually.be.an.instanceof(Array).and.satisfy(function (arr) {
			return arr[0] === 'a' && arr[1] === 'b' && arr[2] === 'c'
		})
	})
	it('should test being given foreign thenables')
})

function makeIterable(arr) {
	if (typeof Symbol === 'function' && Symbol.iterator) {
		var obj = {}
		arr = arr.slice()
		obj[Symbol.iterator] = function () {
			var i = 0
			return {next: function () {
				return i < arr.length
				 ? {done: false, value: arr[i++]}
				 : {done: true}
			}}
		}
		return obj
	}
	return arr
}
