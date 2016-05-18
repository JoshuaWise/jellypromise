'use strict'
require('../tools/describe')('Promise.reject', function (Promise, expect) {
	it('should be rejected with undefined (implicit)', function () {
		return Promise.reject().then(function () {throw new Error('The promise should have bee rejected.')},
			function (reason) {
				expect(reason).to.equal(undefined)
			})
	})
	it('should be rejected with undefined (explicit)', function () {
		return Promise.reject(undefined).then(function () {throw new Error('The promise should have bee rejected.')},
			function (reason) {
				expect(reason).to.equal(undefined)
			})
	})
	it('should be rejected with null', function () {
		return Promise.reject(null).then(function () {throw new Error('The promise should have bee rejected.')},
			function (reason) {
				expect(reason).to.equal(null)
			})
	})
	it('should be rejected with true', function () {
		return Promise.reject(true).then(function () {throw new Error('The promise should have bee rejected.')},
			function (reason) {
				expect(reason).to.equal(true)
			})
	})
	it('should be rejected with false', function () {
		return Promise.reject(false).then(function () {throw new Error('The promise should have bee rejected.')},
			function (reason) {
				expect(reason).to.equal(false)
			})
	})
	it('should be rejected with -Infinity', function () {
		return Promise.reject(NaN).then(function () {throw new Error('The promise should have bee rejected.')},
			function (reason) {
				expect(reason).to.be.NaN
			})
	})
	it('should be rejected with -Infinity', function () {
		return Promise.reject(-Infinity).then(function () {throw new Error('The promise should have bee rejected.')},
			function (reason) {
				expect(reason).to.equal(-Infinity)
			})
	})
	it('should be rejected with 12345', function () {
		return Promise.reject(12345).then(function () {throw new Error('The promise should have bee rejected.')},
			function (reason) {
				expect(reason).to.equal(12345)
			})
	})
	it('should be rejected with \'foobar\'', function () {
		return Promise.reject('foobar').then(function () {throw new Error('The promise should have bee rejected.')},
			function (reason) {
				expect(reason).to.equal('foobar')
			})
	})
	it('should be rejected with \'\'', function () {
		return Promise.reject('').then(function () {throw new Error('The promise should have bee rejected.')},
			function (reason) {
				expect(reason).to.equal('')
			})
	})
	if (typeof Symbol === 'function') {
		it('should be rejected with a symbol', function () {
			var sym = Symbol('foo')
			return Promise.reject(sym).then(function () {throw new Error('The promise should have bee rejected.')},
				function (reason) {
					expect(reason).to.equal(sym)
				})
		})
	}
	it('should be rejected with an object', function () {
		var obj = {foo: 'bar'}
		return Promise.reject(obj).then(function () {throw new Error('The promise should have bee rejected.')},
			function (reason) {
				expect(reason).to.equal(obj)
			})
	})
	it('should be rejected with an array', function () {
		var arr = ['foo', 'bar']
		return Promise.reject(arr).then(function () {throw new Error('The promise should have bee rejected.')},
			function (reason) {
				expect(reason).to.equal(arr)
			})
	})
	it('should be rejected with a regular exporession object', function () {
		var re = /foobar/i
		return Promise.reject(re).then(function () {throw new Error('The promise should have bee rejected.')},
			function (reason) {
				expect(reason).to.equal(re)
			})
	})
	it('should be rejected immediately', function () {
		expect(Promise.reject({}).catchLater().inspect().state).to.equal('rejected')
	})
	it('should be rejected with a promise', function () {
		var p = Promise.resolve(555)
		return Promise.reject(p).then(function () {throw new Error('The promise should have bee rejected.')},
			function (reason) {
				expect(reason).to.equal(p)
			})
	})
})
