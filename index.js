var escodegen = require('escodegen')
var acorn = require('acorn')
var Transform = require('readable-stream/transform')
var gutil = require('gulp-util')
var contentMap = require('./contentMap')

var PluginError = gutil.PluginError

module.exports = function(){
    return new Transform({
        objectMode: true,
        transform: function(file, enc, callback){
            if (file.isNull()) {
                return callback(null, file);
            }

            if(file.isStream()){
                this.emit('error', new PluginError('gulp-babel-nativescript',  'Streaming not supported'));
                return callback(null, file)
            }

            if(file.isBuffer()){
                file.contents = new Buffer(doInject(String(file.contents)))
                return callback(null, file)
            }

            callback(null, file)
        }
    })
}

function doInject(contents){
    var astJson = acorn.parse(contents, {
        ranges: false
    })

    traversal(astJson, null, null)

    var codeStr = escodegen.generate(astJson)

    return codeStr
}

function traversal(node, nodeKey, parentNode){
    if(!node) return

    node._nodeKey = nodeKey
    node._parentNode = parentNode

    var info = contentMap[node.type]
    if(!info) throw new Error('can not find `'+node.type+'` in `contentMap`')

    if(!Array.isArray(info)) info = [info]

    info.forEach(function(info){
        if(!info.contentKey) return

        var content = node[info.contentKey]
        var contentType = Object.prototype.toString.call(content).match(/\[object (.+)\]/)[1]

        // 现在只处理两种情况：
        //  1. module.controller("name", function(){})
        //     module.directive("name", function(){})
        //
        //  2. controller in directive definition:
        //
        //     module.directive("name", function(){
        //       return {
        //         controller: function(){}
        //       }
        //     })
        if(content === 'controller' ||
            content === 'directive' ||
            content === 'config' ||
            content === 'run')
        {
            // xx.directive('name', function)
            var propertyNode
            if(nodeKey == 'property' &&
                node._parentNode._nodeKey == 'callee' &&
                node._parentNode._parentNode)
            {
                var argumentsNode = node._parentNode._parentNode['arguments']
                var functionNode
                if(argumentsNode.length == 2 &&
                    argumentsNode[0].type == 'Literal' &&
                    (functionNode=argumentsNode[1]).type == 'FunctionExpression' &&
                        // 如果函数没有参数，也不必管
                    functionNode.params)
                {
                    var elements = functionNode.params.map(function(param){
                        return {
                            type: 'Literal',
                            value: param.name,
                            raw: '"'+param.name+'"'
                        }
                    })

                    console.log('[Inject] ',
                        node._parentNode.object.name + '.' + content +
                        '("'+argumentsNode[0].value+'", function('+elements.map(function(elem){return elem.value}).join(',')+'){...})'
                    )

                    elements.push(functionNode)

                    argumentsNode[1] = {
                        type: 'ArrayExpression',
                        elements: elements
                    }
                }
            }
            // return { controller: function(){} }
            else if(node.type == 'Identifier' &&
                nodeKey == 'key' &&
                (propertyNode = node._parentNode)._nodeKey == 'properties' &&
                propertyNode.value.type == 'FunctionExpression')
            {
                var elements = propertyNode.value.params.map(function(param){
                    return {
                        type: 'Literal',
                        value: param.name,
                        raw: '"'+param.name+'"'
                    }
                })

                console.log('[Inject] ',
                    content + ': ' +
                    'function('+elements.map(function(elem){return elem.value}).join(',')+'){...})'
                )

                elements.push(propertyNode.value)

                propertyNode.value = {
                    type: 'ArrayExpression',
                    elements: elements
                }
            }
        }

        if(contentType == 'Object') content = [content]
        if(!Array.isArray(content)) return

        content.forEach(function(n){
            traversal(n, info.contentKey, node)
        })
    })
}