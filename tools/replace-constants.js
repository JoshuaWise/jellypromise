var acorn = require('acorn')
var walk = require('acorn/dist/walk')
var Constants = require('./constants')

module.exports = function (directives) {
	var Constant = new Constants(directives)
	return function (source) {
		var ast = acorn.parse(source)
		source = source.split('')
		walk.simple(ast, {
			Literal: function (node) {
				if (typeof node.value !== 'string') return
				if (!Constant.isConstant(node.value)) return
				replace(node, "'" + Constant.getValue(node.value) + "'")
			},
			Identifier: function (node) {
				if (!Constant.isConstant(node.name)) return
				replace(node, Constant.getValue(node.name))
			},
			Function: function (node) {
				if (!node.id) return
				if (!Constant.isConstant(node.id.name)) return
				replace(node.id, Constant.getValue(node.id.name))
			}
		})
		function replace(node, str) {
			for (var i=node.start; i<node.end; i++) {source[i] = ''}
			source[node.start] = str
		}
		return source.join('')
	}
}
