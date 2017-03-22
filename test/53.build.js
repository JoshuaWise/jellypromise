'use strict'
var makeIterable = require('../tools/test/make-iterable')
require('../tools/test/describe')('Promise.build', function (Promise, expect) {
	var defaultThis = (function () {return this}())

	it('should throw on invalid input', function () {
		expect(function () {Promise.build()}).to.throw(TypeError)
		expect(function () {Promise.build(function () {})}).to.throw(TypeError)
		expect(function () {Promise.build('foo', function () {})}).to.throw(TypeError)
		expect(function () {Promise.build({}, function () {})}).to.throw(TypeError)
		expect(function () {Promise.build(null, function () {})}).to.throw(TypeError)
		expect(function () {Promise.build(false, function () {})}).to.throw(TypeError)
		expect(function () {Promise.build(346543, function () {})}).to.throw(TypeError)
		if (typeof Symbol === 'function' && Symbol.iterator) {
			expect(function () {Promise.build(makeIterable(['a', 'b']), function () {})}).to.throw(TypeError)
		}
		expect(function () {Promise.build(['a', 'b'])}).to.throw(TypeError)
		expect(function () {Promise.build(['a', 'b'], 'foo')}).to.throw(TypeError)
		expect(function () {Promise.build(['a', 'b'], ['foo'])}).to.throw(TypeError)
		expect(function () {Promise.build(['a', 'b'], {})}).to.throw(TypeError)
		expect(function () {Promise.build(['a', 'b'], null)}).to.throw(TypeError)
		expect(function () {Promise.build(['a', 'b'], false)}).to.throw(TypeError)
		expect(function () {Promise.build(['a', 'b'], 346543)}).to.throw(TypeError)
	})
	it('should invoke the handler synchronously', function () {
		var invoked = false
		Promise.build(['foo'], function () {invoked = true})
		expect(invoked).to.be.true
	})
	it('should invoke the handler as a function', function () {
		Promise.build(['foo'], function () {
			expect(this).to.equal(defaultThis)
		})
	})
	it('should invoke the handler with 2 function arguments', function () {
		Promise.build(['foo'], function () {
			expect(arguments.length).to.equal(2)
			expect(arguments[0]).to.be.a('function')
			expect(arguments[1]).to.be.a('function')
		})
	})
	describe('should reject if an error is thrown inside the handler', function () {
		specify('throw 0', function () {
			return expect(Promise.build(['foo'], function () {throw 0})).to.be.rejected
		})
		specify('throw true', function () {
			return expect(Promise.build(['foo'], function () {throw true})).to.be.rejected
		})
		specify('throw new Error()', function () {
			var err = new Error()
			return expect(Promise.build(['foo'], function () {throw err})).to.be.rejectedWith(err)
		})
		specify('when given an empty input array', function () {
			var err = new Error()
			return expect(Promise.build([], function () {throw err})).to.be.rejectedWith(err)
		})
	})
	describe('should reject if the second function argument is called', function () {
		specify('throw 0', function () {
			return expect(Promise.build(['foo'], function (s, r) {r(0)})).to.be.rejected
		})
		specify('throw true', function () {
			return expect(Promise.build(['foo'], function (s, r) {r(true)})).to.be.rejected
		})
		specify('throw new Error()', function () {
			var err = new Error()
			return expect(Promise.build(['foo'], function (s, r) {r(err)})).to.be.rejectedWith(err)
		})
		specify('when given an empty input array', function () {
			var err = new Error()
			return expect(Promise.build([], function (s, r) {r(err)})).to.be.rejectedWith(err)
		})
	})
	describe('should be fulfilled correctly', function () {
		specify('synchronously when the input array is empty', function () {
			var promise = Promise.build([], function () {})
			expect(promise.inspect().state).to.equal('fulfilled')
			return expect(promise).to.become({})
		})
		specify('synchronously', function () {
			var promise = Promise.build(['foo', 'bar'], function (set) {
				set('foo', 123)
				set('bar', 456)
			})
			expect(promise.inspect().state).to.equal('fulfilled')
			return expect(promise).to.become({foo: 123, bar: 456})
		})
		specify('asynchronously', function () {
			var promise = Promise.build(['foo', 'bar'], function (set) {
				set('foo', 123)
				setImmediate(function () {
					expect(promise.inspect().state).to.equal('pending')
					set('bar', 456)
					expect(promise.inspect().state).to.equal('fulfilled')
				})
			})
			expect(promise.inspect().state).to.equal('pending')
			return expect(promise).to.become({foo: 123, bar: 456})
		})
	})
	describe('when assigning properties', function () {
		it('should only assign properties that are in the input array', function () {
			return expect(Promise.build(['foo', 'bar'], function (set) {
				expect(set('foo', 123)).to.be.true
				expect(set('bar', 456)).to.be.true
				expect(set('baz', 789)).to.be.false
			})).to.become({foo: 123, bar: 456})
		})
		it('should not assign properties after being rejected', function () {
			var err = new Error()
			return expect(Promise.build(['foo', 'bar'], function (set, rej) {
				expect(set('foo', 123)).to.be.true
				rej(err)
				expect(set('bar', 456)).to.be.false
			})).to.rejectedWith(err)
		})
		it('should be able to overwrite existing properties before the promise is fulfillled', function () {
			return expect(Promise.build(['foo', 'bar'], function (set) {
				expect(set('foo', 123)).to.be.true
				expect(set('foo', 789)).to.be.true
				expect(set('bar', 456)).to.be.true
				expect(set('foo', 555)).to.be.false
			})).to.become({foo: 789, bar: 456})
		})
		it('should allow bulk assignments', function () {
			return expect(Promise.build(['foo', 'bar'], function (set) {
				expect(set({foo: 123, baz: 789})).to.be.true
				expect(set({bar: 456})).to.be.true
			})).to.become({foo: 123, bar: 456})
		})
		it('should finish bulk assignments even when fulfilled midway through', function () {
			return expect(Promise.build(['foo', 'bar'], function (set) {
				expect(set('foo', 123)).to.be.true
				expect(set({bar: 456, foo: 789})).to.be.true
			})).to.become({foo: 789, bar: 456})
		})
		it('should only access the properties of bulk assignment objects once', function () {
			return expect(Promise.build(['foo'], function (set) {
				var obj = {}
				var fooValue = 123
				Object.defineProperty(obj, 'foo', {get: function () {
					return fooValue++
				}, enumerable: true})
				expect(set(obj)).to.be.true
			})).to.become({foo: 123})
		})
		it('should not be affected by the input array changing after execution', function () {
			var keys = ['foo', 'bar']
			return expect(Promise.build(keys, function (set) {
				keys.shift()
				keys.push('baz')
				expect(set('foo', 123)).to.be.true
				expect(set('bar', 456)).to.be.true
				expect(set('baz', 789)).to.be.false
			})).to.become({foo: 123, bar: 456})
		})
	})
})
