'use strict'
require('../tools/test/describe')('Promise.reject', function (Promise, expect) {
	function shouldNotFulfill() {
		throw new Error('This promise should not have been fulfilled.')
	}
	
	it('should be rejected with undefined (implicit)', function () {
		return Promise.reject().then(shouldNotFulfill, function (reason) {
			expect(reason).to.equal(undefined)
		})
	})
	it('should be rejected with undefined (explicit)', function () {
		return Promise.reject(undefined).then(shouldNotFulfill, function (reason) {
			expect(reason).to.equal(undefined)
		})
	})
	it('should be rejected with null', function () {
		return Promise.reject(null).then(shouldNotFulfill, function (reason) {
			expect(reason).to.equal(null)
		})
	})
	it('should be rejected with true', function () {
		return Promise.reject(true).then(shouldNotFulfill, function (reason) {
			expect(reason).to.equal(true)
		})
	})
	it('should be rejected with false', function () {
		return Promise.reject(false).then(shouldNotFulfill, function (reason) {
			expect(reason).to.equal(false)
		})
	})
	it('should be rejected with -Infinity', function () {
		return Promise.reject(NaN).then(shouldNotFulfill, function (reason) {
			expect(reason).to.be.NaN
		})
	})
	it('should be rejected with -Infinity', function () {
		return Promise.reject(-Infinity).then(shouldNotFulfill, function (reason) {
			expect(reason).to.equal(-Infinity)
		})
	})
	it('should be rejected with 12345', function () {
		return Promise.reject(12345).then(shouldNotFulfill, function (reason) {
			expect(reason).to.equal(12345)
		})
	})
	it('should be rejected with \'foobar\'', function () {
		return Promise.reject('foobar').then(shouldNotFulfill, function (reason) {
			expect(reason).to.equal('foobar')
		})
	})
	it('should be rejected with \'\'', function () {
		return Promise.reject('').then(shouldNotFulfill, function (reason) {
			expect(reason).to.equal('')
		})
	})
	if (typeof Symbol === 'function') {
		it('should be rejected with a symbol', function () {
			var sym = Symbol()
			return Promise.reject(sym).then(shouldNotFulfill, function (reason) {
				expect(reason).to.equal(sym)
			})
		})
	}
	it('should be rejected with an object', function () {
		var obj = {}
		return Promise.reject(obj).then(shouldNotFulfill, function (reason) {
			expect(reason).to.equal(obj)
		})
	})
	it('should be rejected with an array', function () {
		var arr = []
		return Promise.reject(arr).then(shouldNotFulfill, function (reason) {
			expect(reason).to.equal(arr)
		})
	})
	it('should be rejected with a regular expression object', function () {
		var re = /foobar/i
		return Promise.reject(re).then(shouldNotFulfill, function (reason) {
			expect(reason).to.equal(re)
		})
	})
	it('should be rejected with a promise object', function () {
		var p = Promise.resolve(3)
		expect(p).to.be.an.instanceof(Promise)
		return Promise.reject(p).then(shouldNotFulfill, function (reason) {
			expect(reason).to.equal(p)
		})
	})
	it('should be rejected with a foreign thenable object', function () {
		var thenable = {then: function (fn1, fn2) {fn1(3)}}
		return Promise.reject(thenable).then(shouldNotFulfill, function (reason) {
			expect(reason).to.equal(thenable)
		})
	})
	it('should be rejected immediately (safe, inaccurate)', function (done) {
		this.timeout(5)
		Promise.reject({}).then(shouldNotFulfill, function () {done()})
	})
	it('should be rejected immediately (unsafe, accurate)', function () {
		expect(Promise.reject({}).catchLater().inspect().state).to.equal('rejected')
	})
})
