'use strict'
require('../tools/test/describe')('.tap', function (Promise, expect) {
	it('should return a new promise', function () {
		var original = Promise.resolve()
		var tapped = original.tap()
		expect(tapped).to.be.an.instanceof(Promise)
		expect(original).to.not.equal(tapped)
	})
	it('should ignore non-function arguments', function (done) {
		Promise.resolve(555).tap('foo').then(function (value) {
			expect(value).to.equal(555)
			done()
		})
	})
	it('should hook into resolved promises', function (done) {
		Promise.resolve(555).tap(function () {
			expect(arguments.length).to.equal(0)
			done()
		})
	})
	it('should not be changed by handler return value', function (done) {
		Promise.resolve(555).tap(function () {
			return 999
		}).then(function (value) {
			expect(value).to.equal(555)
			done()
		})
	})
	it('should be delayed by handler return value', function (done) {
		var timedOut = false
		Promise.resolve(555).tap(function () {
			return new Promise(function (resolve, reject) {
				setTimeout(function () {
					timedOut = true
					resolve(999)
				}, 200)
			})
		}).then(function (value) {
			expect(value).to.equal(555)
			expect(timedOut).to.be.true
			done()
		})
	})
	it('should be rejected if handler throws', function (done) {
		var error = new Error('foobar')
		Promise.resolve(555).tap(function () {
			throw error
		}).then(function () {
			done(new Error('This promise should have be rejected.'))
		}, function (err) {
			expect(err).to.be.an.instanceof(Error)
			expect(err.message).to.equal('foobar')
			expect(err).to.equal(error)
			done()
		})
	})
	it('should be rejected if handler returns a rejected promise', function (done) {
		var error = new Error('barfoo')
		Promise.resolve(555).tap(function () {
			return Promise.reject(error)
		}).then(function () {
			done(new Error('This promise should have be rejected.'))
		}, function (err) {
			expect(err).to.be.an.instanceof(Error)
			expect(err.message).to.equal('barfoo')
			expect(err).to.equal(error)
			done()
		})
	})
	it('should not hook into rejected promises', function (done) {
		var error = new Error('foo')
		Promise.reject(error).tap(function () {
			done(new Error('This handler should not have been invoked.'))
		}).catch(function (err) {
			expect(err).to.be.an.instanceof(Error)
			expect(err.message).to.equal('foo')
			expect(err).to.equal(error)
			done()
		})
	})
})
