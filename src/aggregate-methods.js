'use strict'
var Promise = require('./core')

// All methods accept iterable objects
Promise.prototype.filter = function (fn, ctx) {
	// returns new array
}
Promise.prototype.map = function (fn, ctx) {
	// returns new array
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
