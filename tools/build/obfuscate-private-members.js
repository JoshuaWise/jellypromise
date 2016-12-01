var acorn = require('acorn')
var walk = require('acorn/dist/walk')

module.exports = function () {
	var ids = []
	var names = Object.create(null)
	var current10sDigit = 0;
	function getIdFor(name) {
		if (name in names) {return names[name]}
		var tries = 0
		do {
			if (++tries >= 500) {
				tries = 0
				current10sDigit += 1
			}
			var id = '_' + (current10sDigit || '') + Math.floor(Math.random() * 10)
		} while (ids.indexOf(id) !== -1)
		ids.push(id)
		names[name] = id
		return id
	}
	return function (source) {
		var ast = acorn.parse(source)
		source = source.split('')
		walk.simple(ast, {
			MemberExpression: function (node) {
				if (node.computed) return
				if (node.property.type !== 'Identifier') return
				if (node.property.name[0] !== '_') return
				if (node.property.name[1] === '_') return
				replace(node.property, getIdFor(node.property.name))
			},
			Identifier: function (node) {
				if (node.name[0] !== '_') return
				if (node.name[1] === '_') return
				replace(node, getIdFor(node.name))
			},
			Function: function (node) {
				if (!node.id) return
				if (node.id.name[0] !== '_') return
				if (node.id.name[1] === '_') return
				replace(node.id, getIdFor(node.id.name))
			}
		})
		function replace(node, str) {
			for (var i=node.start; i<node.end; i++) {source[i] = ''}
			source[node.start] = str
		}
		return source.join('')
	}
}
