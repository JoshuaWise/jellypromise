var acorn = require('acorn')
var walk = require('acorn/dist/walk')
var Constants = require('./constants')

module.exports = function () {
	return function (source) {
		var ast = acorn.parse(source)
		source = source.split('')
		walk.simple(ast, {
			Literal: function (node) {
				if (typeof node.value !== 'string') return
				if (!Constants.isConstant(node.value)) return
				replace(node, "'" + Constants.getValue(node.value) + "'")
			},
			Identifier: function (node) {
				if (!Constants.isConstant(node.name)) return
				replace(node, Constants.getValue(node.name))
			},
			Function: function (node) {
				if (!node.id) return
				if (!Constants.isConstant(node.id.name)) return
				replace(node.id, Constants.getValue(node.id.name))
			}
		})
		function replace(node, str) {
			for (var i=node.start; i<node.end; i++) {source[i] = ''}
			source[node.start] = str
		}
		return source.join('')
	}
}
