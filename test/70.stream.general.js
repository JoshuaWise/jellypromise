'use strict'
var makeIterable = require('../tools/test/make-iterable')
var testNonIterables = require('../tools/test/test-non-iterables')
require('../tools/test/describe')('Promise.Stream', function (Promise, expect) {
	var Stream = Promise.Stream
	function shouldBeRejected(promise, reason) {
		expect(promise.inspect().state).to.equal('rejected')
		arguments.length > 1 && expect(promise.inspect().reason).to.be.an.instanceof(reason)
		promise.catchLater()
	}
	function shouldBePending(promise) {
		expect(promise.inspect().state).to.equal('pending')
	}
	it('constructor should expect an event emitter argument', function () {
		expect(function () {new Stream()}).to.throw(TypeError)
		expect(function () {new Stream({})}).to.throw(TypeError)
		expect(function () {new Stream({on: function () {return this}})}).to.throw(TypeError)
		shouldBePending(new Stream({addListener: function () {return this}}))
	})
	describe('Stream.from', function () {
		it('should return a pending stream when given an iterable', function () {
			shouldBePending(Stream.from([]))
			shouldBePending(Stream.from(['a', 'b', 'c']))
			shouldBePending(Stream.from(makeIterable(['a', 'b', 'c'])))
			if (typeof Symbol === 'function' && Symbol.iterator) {
				shouldBePending(Stream.from('abc'))
			}
		})
		describe('should return a rejected stream when given a non-iterable', function () {
			testNonIterables(function (value) {
				shouldBeRejected(Stream.from(value))
			})
		})
	})
	describe('Promise.prototype.stream', function () {
		it('should return a pending stream when given an iterable', function () {
			var a = Promise.resolve([])
			var as = a.stream()
			var b = Promise.resolve(['a', 'b', 'c'])
			var bs = b.stream()
			var c = Promise.resolve(makeIterable(['a', 'b', 'c']))
			var cs = c.stream()
			var all = [
				a.then(function () {shouldBePending(as)}),
				b.then(function () {shouldBePending(bs)}),
				c.then(function () {shouldBePending(cs)})
			]
			if (typeof Symbol === 'function' && Symbol.iterator) {
				var d = Promise.resolve('abc')
				var ds = d.stream()
				all.push(d.then(function () {shouldBePending(ds)}))
			}
			return Promise.all(all)
		})
		describe('should return a rejected stream when given a non-iterable', function () {
			testNonIterables(function (value) {
				var p = Promise.resolve(value)
				var ps = p.stream()
				return p.then(function () {shouldBeRejected(ps)})
			})
		})
	})
})
