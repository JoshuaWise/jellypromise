'use strict'
require('../tools/test/describe')('.inspect', function (Promise, expect) {
	it('should return a non-Promise object', function () {
		var promise = Promise.resolve('foo')
		var inspection = promise.inspect()
		expect(inspection).to.not.equal(promise)
		expect(inspection).to.not.be.an.instanceof(Promise)
		expect(inspection).to.be.an('object')
	})
	describe('the inspecton object', function () {
		it('should only have {state: "pending"} for pending promises', function () {
			var promise = new Promise(function (res) {
				setTimeout(function () {res('bar')}, 1)
			})
			var inspection = promise.inspect()
			expect(inspection).to.have.all.keys(['state'])
			expect(inspection).to.have.property('state', 'pending')
			return expect(promise).to.become('bar')
		})
		it('should have {state: "fulfilled", value: ...} for fulfilled promises', function () {
			var obj = {}
			var promise = Promise.resolve(obj)
			var inspection = promise.inspect()
			expect(inspection).to.have.all.keys(['state', 'value'])
			expect(inspection).to.have.property('state', 'fulfilled')
			expect(inspection).to.have.property('value', obj)
			return expect(promise).to.become(obj)
		})
		it('should have {state: "rejected", reason: ...} for rejected promises', function () {
			var error = new Error
			var promise = Promise.reject(error)
			var inspection = promise.inspect()
			expect(inspection).to.have.all.keys(['state', 'reason'])
			expect(inspection).to.have.property('state', 'rejected')
			expect(inspection).to.have.property('reason', error)
			return expect(promise).to.be.rejectedWith(error)
		})
		it('should not be a live object (it is just a snapshot)', function () {
			var promise = new Promise(function (res) {
				setTimeout(function () {res('bar')}, 1)
			})
			var inspection = promise.inspect()
			expect(inspection).to.have.all.keys(['state'])
			expect(inspection).to.have.property('state', 'pending')
			return promise.then(function (value) {
				expect(value).to.equal('bar')
				expect(inspection).to.have.all.keys(['state'])
				expect(inspection).to.have.property('state', 'pending')
			})
		})
	})
	describe('should not affect the promise itself', function () {
		if (Promise.suppressUnhandledRejections) {
			var originalSuppressionValue = Promise.suppressUnhandledRejections
			before(function () {
				Promise.suppressUnhandledRejections = false
			})
			after(function () {
				Promise.suppressUnhandledRejections = originalSuppressionValue
			})
		}
		
		specify('should not change its fulfillment value', function () {
			var promise = Promise.resolve('bar')
			promise.inspect()
			return expect(promise).to.become('bar')
		})
		specify('should not change its eventual fulfillment value', function () {
			var promise = new Promise(function (res) {
				setTimeout(function () {res('bar')}, 1)
			})
			promise.inspect()
			return expect(promise).to.become('bar')
		})
		specify('should not change its rejection reason', function () {
			var error = new Error
			var promise = Promise.reject(error)
			promise.inspect()
			return expect(promise).to.be.rejectedWith(error)
		})
		specify('should not change its eventual rejection reason', function () {
			var error = new Error
			var promise = new Promise(function (res, rej) {
				setTimeout(function () {rej(error)}, 1)
			})
			promise.inspect()
			return expect(promise).to.be.rejectedWith(error)
		})
		specify('should not set its SUPPRESS_UNHANDLED_REJECTIONS flag', function (done) {
			var consoleError = console.error
			var timer = setTimeout(function () {
				promise.catchLater()
				console.error = consoleError
				done(new Error('console.error was not invoked for an unhandled rejection.'))
			}, 100)
			console.error = function () {
				clearTimeout(timer)
				console.error = consoleError
				done()
			}
			var promise = Promise.reject(new Error)
			promise.inspect()
		})
		specify('should not unset its SUPPRESS_UNHANDLED_REJECTIONS flag', function (done) {
			var consoleError = console.error
			var timer = setTimeout(function () {
				console.error = consoleError
				done()
			}, 100)
			console.error = function () {
				clearTimeout(timer)
				console.error = consoleError
				done(new Error('The promise\'s unhandled rejection should have been suppressed.'))
			}
			var promise = Promise.reject(new Error)
			promise.catchLater()
			promise.inspect()
		})
	})
})
