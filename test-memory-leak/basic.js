'use strict'
var assert = require('assert')
var Promise = require('../')

module.exports = function (callback) {
	var baseCount = 1000 // 100000
	var i = 0
	var sampleA
	var sampleB
	(function next() {
		return new Promise(function (resolve) {
			if (i++ === baseCount) {
				global.gc()
				sampleA = process.memoryUsage().heapUsed
			}
			if (i > baseCount * 10) {
				global.gc()
				sampleB = process.memoryUsage().heapUsed
				console.log('Memory usage at start:\t', sampleA)
				console.log('Memory usage at end:\t', sampleB)
				if (sampleA * 1.01 > sampleB) {
					callback()
				} else {
					callback(new Error('Memory usage should not grow by more than 1%'))
				}
			} else {
				setImmediate(resolve)
			}
		}).then(next)
	}())
}
