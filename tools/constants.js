var constants = {
	NO_STATE: 0x0,
	
	IS_FULFILLED: 0x1,
	IS_REJECTED: 0x2,
	IS_FOLLOWING: 0x4, // Proxy for a promise that could be pending, fulfilled, or rejected.
	
	SINGLE_HANDLER: 0x8,
	MANY_HANDLERS: 0x10,
	
	SUPPRESS_UNHANDLED_REJECTIONS: 0x20,
	
	IS_FINAL: 0x1 | 0x2,
	IS_RESOLVED: 0x1 | 0x2 | 0x4,
	HAS_SOME_HANDLER: 0x8 | 0x10,
	
	UUID: {
		value: '__c9d565ea_0267_11e6_8d22_5e5517507c66',
		directives: ['development'], // Don't show in production builds.
		allowEmbedded: true // This constant can be part of other identifiers and strings.
	}
}

function Constants(directives) {
	var keys = Object.keys(constants)
	this._directives = directives
	this._constantList = keys.map(prepend$)
	this._values = Object.create(null)
	this._allowEmbedded = []
	keys.forEach(parseConstantEntry, this)
}
Constants.prototype.isConstant = function (name) {
	if (this._constantList.indexOf(name) !== -1) {
		return true
	}
	var embeddeds = this._allowEmbedded
	for (var i=0, len=embeddeds.length; i<len; i++) {
		if (name.indexOf(embeddeds[i]) !== -1) {
			return true
		}
	}
	return false
}
Constants.prototype.getValue = function (name) {
	if (name in this._values) {
		return this._values[name]
	}
	
	var embeddeds = this._allowEmbedded
	for (var i=0, len=embeddeds.length; i<len; i++) {
		var key = embeddeds[i]
		var indexOf = name.indexOf(key)
		if (indexOf !== -1) {
			return name.slice(0, indexOf) + this._values[key] + name.slice(indexOf + key.length)
		}
	}
	
	throw new Error('"' + name + '" is not a valid constant.')
}
var directiveIn = require('./directive').prototype.in;
module.exports = Constants

function parseConstantEntry(key, i) {
	var entry = constants[key]
	key = this._constantList[i]
	if (entry === null || typeof entry !== 'object') {
		this._values[key] = '' + entry
		return
	}
	
	if (entry.allowEmbedded) {
		this._allowEmbedded.push(key)
	}
	if (entry.directives) {
		var fakeDirective = {_directives: entry.directives}
		var include = directiveIn.call(fakeDirective, this._directives)
		this._values[key] = include ? '' + entry.value : ''
	} else {
		this._values[key] = '' + entry.value
	}
}
function prepend$(str) {
	return '$' + str
}
