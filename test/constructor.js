'use strict'
require('../tools/describe')('Promise.constructor', function (Promise, expect) {
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
	it('should provide the resolve and reject functions', function () {
		var resolve, reject
		var ret = expect(new Promise(function (res, rej) {
			expect(arguments.length).to.equal(2)
			expect(res).to.be.a('function')
			expect(rej).to.be.a('function')
			resolve = res
			reject = rej
		})).to.become(55)
		resolve(55)
		resolve(352354)
		reject(new Error('Rejection after promise was resolved.'))
		return ret
	})
	it('should reject if the handler throws', function () {
		return expect(new Promise(function () {
			throw new Error('foo bar')
		})).to.be.rejectedWith(Error)
	})
})
