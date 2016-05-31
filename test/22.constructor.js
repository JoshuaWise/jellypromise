'use strict'
require('../tools/describe')('Promise.constructor', function (Promise, expect) {
	var defaultThis = (function () {return this}())
	
	it('should throw on invalid input', function () {
		expect(function () {new Promise()}).to.throw(TypeError)
		expect(function () {new Promise('foo')}).to.throw(TypeError)
		expect(function () {new Promise({})}).to.throw(TypeError)
		expect(function () {new Promise(null)}).to.throw(TypeError)
		expect(function () {new Promise(false)}).to.throw(TypeError)
		expect(function () {new Promise(346543)}).to.throw(TypeError)
	})
	it('should throw when called without "new"', function () {
		expect(function () {Promise()}).to.throw(TypeError)
		expect(function () {Promise(function () {})}).to.throw(TypeError)
	})
	it('should invoke the handler synchronously', function () {
		var invoked = false
		new Promise(function () {invoked = true})
		expect(invoked).to.be.true
	})
	it('should invoke the handler as a function', function () {
		new Promise(function () {
			expect(this).to.equal(defaultThis)
		})
	})
	it('should invoke the handler with 2 function arguments', function () {
		new Promise(function () {
			expect(arguments.length).to.equal(2)
			expect(arguments[0]).to.be.a('function')
			expect(arguments[1]).to.be.a('function')
		})
	})
	it('should reject if an error is thrown inside the handler', function () {
		var err = new Error()
		expect(new Promise(function () {throw 0})).to.be.rejected
		expect(new Promise(function () {throw true})).to.be.rejected
		expect(new Promise(function () {throw err})).to.be.rejectedWith(err)
	})
	
	// Everything below is taken from, or inspired by https://github.com/petkaantonov/bluebird
	
	function createPendingPromise() {
		var resolve, reject
		var p = new Promise(function () {
			resolve = arguments[0]
			reject = arguments[1]
		})
		p.resolve = resolve
		p.reject = reject
		return p
	}
	function fulfills(value, test) {
		specify('immediately-fulfilled', function () {
			return test(new Promise(function (res) {
				res(value)
			}))
		})
		specify('eventually-fulfilled', function () {
			return test(new Promise(function (res) {
				setTimeout(function () {
					res(value)
				}, 1)
			}))
		})
	}
	function rejects(reason, test) {
		specify('immediately-rejected', function () {
			return test(new Promise(function (res, rej) {
				rej(reason)
			}))
		})
		specify('eventually-rejected', function () {
			return test(new Promise(function (res, rej) {
				setTimeout(function () {
					rej(reason)
				}, 1)
			}))
		})
	}
	function testFulfilled(value, test) {
		describe('immediate value', function () {
			fulfills(value, test)
		})
		describe('fulfilled promise for value', function () {
			fulfills(Promise.resolve(value), test)
		})
		describe('immediately fulfilled promise for value', function () {
			var p = createPendingPromise()
			fulfills(p, test)
			p.resolve(value)
		})
		describe('eventually fulfilled promise for value', function () {
			var p = createPendingPromise()
			setTimeout(function () {
				p.resolve(value)
			}, 1)
			fulfills(p, test)
		})
		describe('synchronous thenable for value', function () {
			fulfills({
				then: function (fn) {
					fn(value)
				}
			}, test)
		})
		describe('asynchronous thenable for value', function () {
			fulfills({
				then: function (fn) {
					setTimeout(function () {
						fn(value)
					}, 1)
				}
			}, test)
		})
	}
	function testRejected(reason, test) {
		describe('immediate reason', function () {
			return rejects(reason, test)
		})
	}
	function shouldNotFulfill() {
		throw new Error('This promise should not have been fulfilled.')
	}
	
	describe('resolves the promise with the given object value', function () {
		var obj = {}
		testFulfilled(obj, function (promise) {
			return expect(promise).to.eventually.equal(obj)
		})
	})
	describe('resolves the promise with the given primitive value', function () {
		testFulfilled(3, function (promise) {
			return expect(promise).to.eventually.equal(3)
		})
	})
	describe('resolves the promise with the given undefined value', function () {
		testFulfilled(undefined, function (promise) {
			return expect(promise).to.eventually.equal(undefined)
		})
	})
	describe('rejects the promise with the given object reason', function () {
		var obj = {}
		testRejected(obj, function (promise) {
			return promise.then(shouldNotFulfill, function (reason) {
				expect(reason).to.equal(obj)
			})
		})
	})
	describe('rejects the promise with the given primitive reason', function () {
		testRejected(3, function (promise) {
			return promise.then(shouldNotFulfill, function (reason) {
				expect(reason).to.equal(3)
			})
		})
	})
	describe('rejects the promise with the given undefined reason', function () {
		testRejected(undefined, function (promise) {
			return promise.then(shouldNotFulfill, function (reason) {
				expect(reason).to.equal(undefined)
			})
		})
	})
})
