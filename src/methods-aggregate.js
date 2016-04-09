'use strict'
var Promise = require('./promise')
var asArray = require('./util').asArray
var INTERNAL = require('./util').INTERNAL

// NOTE:
// When not using Promise.all (i.e., when using the raw array that was passed),
// deleted indexes are not filled in with undefineds, and thus will be skipped
// by the array methods.

// All methods accept iterable objects
Promise.prototype.filter = function (fn, ctx) {
	return this.then(function (iterable) {
		return new PromiseMapper(iterable, fn, ctx, true).promise
	})
}
Promise.prototype.map = function (fn, ctx) {
	return this.then(function (iterable) {
		return new PromiseMapper(iterable, fn, ctx, false).promise
	})
}
Promise.prototype.forEach = function (fn, ctx) {
	// returns same array (actually same, or safe copy?)
}
Promise.prototype.reduce = function (fn, seed) {
	// returns result (order matters)
}
Promise.prototype.reduceRight = function (fn, seed) {
	// returns result (order matters)
}

function PromiseMapper(iterable, fn, ctx, filter) {
	this.promise = new Promise(INTERNAL)
	this.alive = true
	var input = this.input = asArray(iterable)
	var len = this.length = this.pendings = this.input.length
	var values = this._values = new Array(len)
	for (var i=0; i<len; i++) {
		var item = input[i]
		if (Promise.isPromise(item)) {
			var p = Promise.resolve(item)
			// make p invoke this.valueResolved
		} else {
			this.valueResolved(item, i)
		}
	}
}
PromiseMapper.prototype.valueResolved = function (value, i) {
	if (this.alive) {
		this.values[i] = item
		// do map logic here
		--this.pendings || this.resolve()
	}
}
PromiseMapper.prototype.resolve = function () {
	this.alive = false
	resolve(this.promise, this.values)
}
