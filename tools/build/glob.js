var Promise = require('bluebird')
var globPromise = Promise.promisify(require('glob'))

module.exports = function (pattern) {
	return function () {return globPromise(pattern)}
}
