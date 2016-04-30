'use strict'
require('../tools/describe')('Promise.all', function (Promise, expect) {
	it('should be rejected on invalid input', function () {
		return expect(Promise.all(123)).to.be.rejectedWith(TypeError)
	})
	it('should be fulfilled given an empty array', function () {
		return expect(Promise.all([])).to.eventually.be.an.instanceof(Array).and.be.empty
	})
	it('should be fulfilled with an array of values', function () {
		var obj = {}
		return expect(Promise.all(['a', 123, 'z', obj])).to.eventually.be.an.instanceof(Array).and.satisfy(function (arr) {
			return arr[0] === 'a'
				&& arr[1] === 123
				&& arr[2] === 'z'
				&& arr[3] === obj
		})
	})
	it('should be fulfilled with an array of promises', function () {
		var obj = {}
		return expect(Promise.all([
			Promise.resolve('b'), Promise.resolve(321), Promise.resolve('y'), Promise.resolve(obj)
		])).to.eventually.be.an.instanceof(Array).and.satisfy(function (arr) {
			return arr[0] === 'b'
				&& arr[1] === 321
				&& arr[2] === 'y'
				&& arr[3] === obj
		})
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
		input[800] = 'very high index'
		return expect(Promise.all(input)).to.eventually.be.an.instanceof(Array).and.satisfy(function (arr) {
			if (arr.length !== 801
				|| !(0 in arr) || arr[0] !== undefined
				|| !(1 in arr) || arr[1] !== obj
				|| !(2 in arr) || arr[2] !== 'x'
				|| !(3 in arr) || arr[3] !== undefined) {
				return false
			}
			for (var i=4; i<800; i++) {
				if (!(i in arr) || arr[i] !== undefined) {
					return false
				}
			}
			return 800 in arr && arr[800] === 'very high index'
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
