'use strict'
require('../tools/describe')('Promise.resolve', function (Promise, expect) {
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
		return expect(Promise.resolve("foobar")).to.eventually.equal("foobar")
	})
	it('should be fulfilled with \'\'', function () {
		return expect(Promise.resolve('')).to.eventually.equal('')
	})
	if (typeof Symbol === 'function') {
		it('should be fulfilled with a symbol', function () {
			var sym = Symbol('foo')
			return expect(Promise.resolve(sym)).to.eventually.equal(sym)
		})
	}
	it('should be fulfilled with an object', function () {
		var obj = {foo: 'bar'}
		return expect(Promise.resolve(obj)).to.eventually.equal(obj)
	})
	it('should be fulfilled with an array', function () {
		var arr = ['foo', 'bar']
		return expect(Promise.resolve(arr)).to.eventually.equal(arr)
	})
	it('should be fulfilled with a regular exporession object', function () {
		var re = /foobar/i
		return expect(Promise.resolve(re)).to.eventually.equal(re)
	})
	it('should be fulfilled immediately', function () {
		expect(Promise.resolve({}).inspect().state).to.equal('fulfilled')
	})
	it('should return the given trusted promise', function () {
		var p = Promise.resolve(555)
		var res = Promise.resolve(p)
		expect(p).to.equal(res)
		return expect(res).to.eventually.equal(555)
	})
	it('should test being given foreign thenables')
})
