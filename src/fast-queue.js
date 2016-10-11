'use strict'

var FastQueue = module.exports = function () {
	this._capacity = 16 // Must be a multiple of 2
	this._length = 0
	this._front = 0
}

FastQueue.prototype.push = function (value) {
	if (this._capacity === this._length) {
		arrayMove(this, this._capacity, this._front)
		this._capacity <<= 1
	}
	this[(this._front + this._length++) & (this._capacity - 1)] = value
}

FastQueue.prototype.shift = function () {
	var front = this._front
	var ret = this[front]
	this[front] = undefined
	this._front = (front + 1) & (this._capacity - 1)
	--this._length
	return ret
}

var arrayMove = function (array, moveAmount, len) {
	for (var i=0; i<len; ++i) {
		array[i + moveAmount] = array[i]
		array[i] = undefined
	}
}
