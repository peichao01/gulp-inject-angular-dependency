var escodegen  = require('escodegen')
var acorn      = require('acorn')
var Transform  = require('readable-stream/transform')
var gutil      = require('gulp-util')
var colors     = require('colors')
var contentMap = require('./contentMap')

var PluginError = gutil.PluginError

/**
 * @param [filterFn] if not send, all files will be injected.
 */
module.exports = function (filterFn) {
    return new Transform({
        objectMode: true,
        transform:  function (file, enc, callback) {
            if (file.isNull()) {
                return callback(null, file);
            }

            if (file.isStream()) {
                this.emit('error', new PluginError('gulp-babel-nativescript', 'Streaming not supported'));
                return callback(null, file)
            }

            if (file.isBuffer()) {
                if (!filterFn || filterFn(file.path)) {
                    file.contents = new Buffer(doInject(String(file.contents), file.path))
                }

                return callback(null, file)
            }

            callback(null, file)
        }
    })
}

/*module.exports = function () {
    var fs   = require('fs')
    var path = require('path')

    var jsFilePath = path.join(__dirname, '../../www/js/modules/user/directives/bpCheckbox.js')
    var content    = fs.readFileSync(jsFilePath, 'utf8')
    doInject(content, jsFilePath)
}
module.exports()*/

function doInject(contents, filePath) {
    var astJson = acorn.parse(contents, {
        ranges: false
    })

    traversal(astJson, null, null, filePath)

    var codeStr = escodegen.generate(astJson)

    return codeStr
}

function traversal(node, nodeKey, parentNode, filePath) {
    if (!node) return

    node._nodeKey    = nodeKey
    node._parentNode = parentNode

    var info = contentMap[node.type]
    if (!info) throw new Error('can not find `' + node.type + '` in `contentMap`')

    if (!Array.isArray(info)) info = [info]

    info.forEach(function (info) {
        if (!info.contentKey) return

        var content     = node[info.contentKey]
        var contentType = Object.prototype.toString.call(content).match(/\[object (.+)\]/)[1]

        /**
         * only support the following two situation：
         *
         * 1.
         *  module.controller("name", function(){})
         *  module.directive("name", function(){})
         *  module.config(function(){})
         *  module.run(function(){})
         *
         * 2. controller in directive definition:
         *
         * module.directive("name", function(){
         *  return {
         *      restrict: '',
         *      controller: function(){}
         *  }
         * })
         *
         */
        if (['controller', 'directive', 'config', 'run'].indexOf(content) >= 0) {
            // xx.directive('name', function)
            var propertyNode
            if (nodeKey == 'property' &&
                node._parentNode._nodeKey == 'callee' &&
                node._parentNode._parentNode) {
                var argumentsNode = node._parentNode._parentNode['arguments']
                var functionNode, isSupport, fnIndex

                if (content === 'config' ||
                    content === 'run') {
                    fnIndex = 0
                    isSupport = argumentsNode.length == 1 &&
                        (functionNode = argumentsNode[fnIndex]).type == 'FunctionExpression' &&
                            // 如果函数没有参数，也不必管
                        functionNode.params
                }
                else if (content === 'controller' ||
                    content === 'directive') {
                    fnIndex = 1
                    isSupport = argumentsNode.length == 2 &&
                        argumentsNode[0].type == 'Literal' &&
                        (functionNode = argumentsNode[fnIndex]).type == 'FunctionExpression' &&
                            // 如果函数没有参数，也不必管
                        functionNode.params
                }

                if (isSupport) {
                    var elements = functionNode.params.map(function (param) {
                        return {
                            type:  'Literal',
                            value: param.name,
                            raw:   '"' + param.name + '"'
                        }
                    })

                    log(filePath,
                        node._parentNode.object.name + '.' + content +
                        '("' + argumentsNode[fnIndex].value + '", function(' + elements.map(function (elem) {
                            return elem.value
                        }).join(',') + '){...})'
                    )

                    elements.push(functionNode)

                    argumentsNode[fnIndex] = {
                        type:     'ArrayExpression',
                        elements: elements
                    }
                }
            }
            // return { restrict: '', controller: function(){} }
            else if (node.type == 'Identifier' &&
                nodeKey == 'key' &&
                (propertyNode = node._parentNode)._nodeKey == 'properties' &&
                propertyNode.value.type == 'FunctionExpression') {
                var isDirectiveController
                /**
                 * only support stationary code structure:
                 *
                 * module.directive('xx', function(){
                 *  return {
                 *      restrict: '',
                 *      controller: function($scope, ...){}
                 *  }
                 * })
                 *
                 * not support others like:
                 *
                 * module.directive('xx', function(){
                 *  var tmp = {}
                 *  tmp.restrict = ''
                 *  tmp.controller = function($scope, ...){}
                 *  return tmp
                 * })
                 */
                try {
                    if (propertyNode._parentNode.properties.some(function (propertyNode) {
                            return propertyNode.key.name == 'restrict'
                        }) &&
                        propertyNode._parentNode._parentNode._parentNode._parentNode._parentNode._parentNode.callee.property.name === 'directive') {
                        isDirectiveController = true
                    }
                }
                catch (e) {
                }

                if (!isDirectiveController) return

                var elements = propertyNode.value.params.map(function (param) {
                    return {
                        type:  'Literal',
                        value: param.name,
                        raw:   '"' + param.name + '"'
                    }
                })

                log(filePath,
                    content + ': ' +
                    'function(' + elements.map(function (elem) {
                        return elem.value
                    }).join(',') + '){...})'
                )

                elements.push(propertyNode.value)

                propertyNode.value = {
                    type:     'ArrayExpression',
                    elements: elements
                }
            }
        }

        if (contentType == 'Object') content = [content]
        if (!Array.isArray(content)) return

        content.forEach(function (n) {
            traversal(n, info.contentKey, node, filePath)
        })
    })
}

function log(filePath, msg) {
    console.log(colors.blue('[Inject]') + ' in file: `' + colors.green(filePath) + '` :')
    console.log('    ' + msg)
}