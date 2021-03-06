var constants = {
	NO_STATE: 1 << 7, // This must be (1 << UNHANDLED_ENDPOINTS).

	IS_FULFILLED: 0x1,
	IS_REJECTED: 0x2,
	IS_FOLLOWING: 0x4,

	SINGLE_HANDLER: 0x8,
	MANY_HANDLERS: 0x10,

	IS_HANDLED: 0x20,
	LOGGED_UNHANDLED_REJECTION: 0x40,

	IS_FINAL: 0x1 | 0x2,
	IS_RESOLVED: 0x1 | 0x2 | 0x4,
	HAS_SOME_HANDLER: 0x8 | 0x10,

	UNHANDLED_ENDPOINTS: 7, // This must be the number of normal bit flags.
	FLAGS: Math.pow(2, 7) - 1, // This must be Math.pow(UNHANDLED_ENDPOINTS) - 1
	MAX_UNHANDLED_ENDPOINTS: 0xffffffff >>> 7, // This must be (0xffffffff >>> UNHANDLED_ENDPOINTS).

	STREAM_OPEN: 0x0,
	STREAM_CLOSING: 0x1,
	STREAM_CLOSED: 0x2,
	STREAM_NOT_OPEN: 0x1 | 0x2,
	STREAM_IS_FROM_PIPE: 0x4,

	NO_INTEGER: -1
}

function Constants() {
	var keys = Object.keys(constants)
	this._constantList = keys.map(prepend$)
	this._values = Object.create(null)
	keys.forEach(parseConstantEntry, this)
}
Constants.prototype.isConstant = function (name) {
	return this._constantList.indexOf(name) !== -1
}
Constants.prototype.getValue = function (name) {
	if (name in this._values) {
		return this._values[name]
	}
	throw new Error('"' + name + '" is not a valid constant.')
}
module.exports = new Constants

function parseConstantEntry(key, i) {
	this._values[this._constantList[i]] = '' + constants[key]
}
function prepend$(str) {
	return '$' + str
}
