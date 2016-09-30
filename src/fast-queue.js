'use strict'
module.exports = FastQueue

function FastQueue() {
	this.capacity = 16 // Must be a multiple of 2
	this.length = 0
	this.front = 0
}

FastQueue.prototype.push = function (value) {
	if (this.capacity === this.length) {
		arrayMove(this, this.capacity, this.front)
		this.capacity <<= 1
	}
	this[(this.front + this.length++) & (this.capacity - 1)] = value
}

FastQueue.prototype.shift = function () {
	var front = this.front
	var ret = this[front]
	this[front] = undefined
	this.front = (front + 1) & (this.capacity - 1)
	--this.length
	return ret
}

function arrayMove(array, moveAmount, len) {
	for (var i=0; i<len; ++i) {
		array[i + moveAmount] = array[i]
		array[i] = undefined
	}
}
