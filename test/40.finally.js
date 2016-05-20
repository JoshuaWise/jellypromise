'use strict'
require('../tools/describe')('.finally', function (Promise, expect) {
	it('should hook into resolved promises', function (done) {
		Promise.resolve(555).finally(function () {
			expect(arguments.length).to.equal(0)
			done()
		})
	})
	it('should not be changed by handler return value', function (done) {
		Promise.resolve(555).finally(function () {
			return 999
		}).then(function (value) {
			expect(value).to.equal(555)
			done()
		})
	})
	it('should be delayed by handler return value', function (done) {
		var timedOut = false
		Promise.resolve(555).finally(function () {
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
		Promise.resolve(555).finally(function () {
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
		Promise.resolve(555).finally(function () {
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
	it('should hook into rejected promises', function (done) {
		Promise.reject(new Error('foo')).finally(function () {
			expect(arguments.length).to.equal(0)
			done()
		}).catchLater()
	})
	it('should not be fulfilled by handler return value', function (done) {
		var error = new Error('foo')
		Promise.reject(error).finally(function () {
			return 999
		}).then(function () {
			done(new Error('This promise should have be rejected.'))
		}, function (err) {
			expect(err).to.be.an.instanceof(Error)
			expect(err.message).to.equal('foo')
			expect(err).to.equal(error)
			done()
		})
	})
	it('should be delayed by handler return value, even when rejected first', function (done) {
		var timedOut = false
		var error = new Error('foobar')
		Promise.reject(error).finally(function () {
			return new Promise(function (resolve, reject) {
				setTimeout(function () {
					timedOut = true
					resolve(999)
				}, 200)
			})
		}).then(function () {
			done(new Error('This promise should have be rejected.'))
		}, function (err) {
			expect(err).to.be.an.instanceof(Error)
			expect(err.message).to.equal('foobar')
			expect(err).to.equal(error)
			expect(timedOut).to.be.true
			done()
		})
	})
	it('should be rejected with the error that the handler throws', function (done) {
		var error = new SyntaxError('baz')
		Promise.reject(new TypeError('foobar')).finally(function () {
			throw error
		}).then(function () {
			done(new Error('This promise should have be rejected.'))
		}, function (err) {
			expect(err).to.be.an.instanceof(SyntaxError)
			expect(err.message).to.equal('baz')
			expect(err).to.equal(error)
			done()
		})
	})
	it('should be rejected by the rejected promsie returned by the handler', function (done) {
		var error = new SyntaxError('baz')
		Promise.reject(new TypeError('foobar')).finally(function () {
			return Promise.reject(error)
		}).then(function () {
			done(new Error('This promise should have be rejected.'))
		}, function (err) {
			expect(err).to.be.an.instanceof(SyntaxError)
			expect(err.message).to.equal('baz')
			expect(err).to.equal(error)
			done()
		})
	})
})
