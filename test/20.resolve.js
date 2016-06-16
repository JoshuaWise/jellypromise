'use strict'
require('../tools/test/describe')('Promise.resolve', function (Promise, expect) {
	it('should be fulfilled with undefined (implicit)', function () {
		return expect(Promise.resolve()).to.eventually.equal(undefined)
	})
	it('should be fulfilled with undefined (explicit)', function () {
		return expect(Promise.resolve(undefined)).to.eventually.equal(undefined)
	})
	it('should be fulfilled with null', function () {
		return expect(Promise.resolve(null)).to.eventually.equal(null)
	})
	it('should be fulfilled with true', function () {
		return expect(Promise.resolve(true)).to.eventually.equal(true)
	})
	it('should be fulfilled with false', function () {
		return expect(Promise.resolve(false)).to.eventually.equal(false)
	})
	it('should be fulfilled with NaN', function () {
		return expect(Promise.resolve(NaN)).to.eventually.be.NaN
	})
	it('should be fulfilled with -Infinity', function () {
		return expect(Promise.resolve(-Infinity)).to.eventually.equal(-Infinity)
	})
	it('should be fulfilled with 12345', function () {
		return expect(Promise.resolve(12345)).to.eventually.equal(12345)
	})
	it('should be fulfilled with \'foobar\'', function () {
		return expect(Promise.resolve('foobar')).to.eventually.equal('foobar')
	})
	it('should be fulfilled with \'\'', function () {
		return expect(Promise.resolve('')).to.eventually.equal('')
	})
	if (typeof Symbol === 'function') {
		it('should be fulfilled with a symbol', function () {
			var sym = Symbol()
			return expect(Promise.resolve(sym)).to.eventually.equal(sym)
		})
	}
	it('should be fulfilled with an object', function () {
		var obj = {}
		return expect(Promise.resolve(obj)).to.eventually.equal(obj)
	})
	it('should be fulfilled with an array', function () {
		var arr = []
		return expect(Promise.resolve(arr)).to.eventually.equal(arr)
	})
	it('should be fulfilled with an array, ignoring nested promises', function () {
		var arr = [Promise.reject(3), Promise.resolve(3)]
		arr[0].then(null, function () {})
		return Promise.resolve(arr).then(function (value) {
			expect(value).to.equal(arr)
			expect(value[0]).to.be.an.instanceof(Promise)
			expect(value[1]).to.be.an.instanceof(Promise)
		})
	})
	it('should be fulfilled with a regular expression object', function () {
		var re = /foobar/i
		return expect(Promise.resolve(re)).to.eventually.equal(re)
	})
	it('should be fulfilled immediately (safe, inaccurate)', function (done) {
		this.timeout(5)
		Promise.resolve({}).then(function () {done()})
	})
	it('should be fulfilled immediately (unsafe, accurate)', function () {
		expect(Promise.resolve({}).inspect().state).to.equal('fulfilled')
	})
	it('when given a trusted promise, should return that promise', function () {
		var p = Promise.resolve(3)
		var result = Promise.resolve(p)
		expect(p).to.equal(result)
		return expect(result).to.eventually.equal(3)
	})
	describe('when given a foreign thenable, should be resolved by that thenable', function () {
		function shouldNotFulfill() {
			throw new Error('This promise should not have been fulfilled.')
		}
		function testThenable(thenableFactory) {
			specify('resolved', function () {
				var p = Promise.resolve(thenableFactory(true))
				expect(p).to.be.an.instanceof(Promise)
				return expect(p).to.eventually.equal(3)
			})
			specify('rejected', function () {
				var p = Promise.resolve(thenableFactory(false))
				expect(p).to.be.an.instanceof(Promise)
				return p.then(shouldNotFulfill, function (reason) {
					expect(reason).to.equal(3)
				})
			})
		}
		
		describe('synchronous foreign thenable', function () {
			testThenable(function (fulfilled) {
				return {then: function (onFulfilled, onRejected) {
					;(fulfilled ? onFulfilled : onRejected)(3)
				}}
			})
		})
		
		describe('asynchronous foreign thenable', function () {
			testThenable(function (fulfilled) {
				return {then: function (onFulfilled, onRejected) {
					setTimeout(function () {
						;(fulfilled ? onFulfilled : onRejected)(3)
					}, 1)
				}}
			})
		})
	})
})
