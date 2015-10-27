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
module.exports = function (filterFn, outputLog) {
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
                    file.contents = new Buffer(doInject(String(file.contents), file.path, outputLog))
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

 var jsFilePath = path.join(__dirname, '../../www/js/modules/common/directives/bpCountdownButton.js')
 var content    = fs.readFileSync(jsFilePath, 'utf8')
 doInject(content, jsFilePath)
 }
 module.exports()*/

function doInject(contents, filePath, outputLog) {
    var astJson = acorn.parse(contents, {
        ranges: false
    })

    traversal(astJson, null, null, filePath, outputLog)

    var codeStr = escodegen.generate(astJson)

    return codeStr
}

function traversal(node, nodeKey, parentNode, filePath, outputLog) {
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
         *  module.service("name", function(){})
         *  module.factory("name", function(){})
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
         * module.provider("name", function(){
         *  return {
         *      $get: function($http){}
         *  }
         * })
         *
         */
        // provider 不可以注入
        var args2Keywords       = ['controller', 'directive', 'service', 'factory']
        var args1Keywords       = ['config', 'run']
        var memberOfObjToReturn = ['controller', '$get']
        var isArgs1
        if ((isArgs1 = args1Keywords.indexOf(content) >= 0) ||
            args2Keywords.indexOf(content) >= 0 ||
            memberOfObjToReturn.indexOf(content) >= 0) {

            // xx.directive('name', function)
            var propertyNode
            if (nodeKey == 'property' &&
                node._parentNode._nodeKey == 'callee' &&
                node._parentNode._parentNode) {
                var argumentsNode = node._parentNode._parentNode['arguments']
                var functionNode, isSupport, fnIndex

                if (isArgs1) {
                    fnIndex   = 0
                    isSupport = argumentsNode.length == 1 &&
                        (functionNode = argumentsNode[fnIndex]).type == 'FunctionExpression' &&
                            // 如果函数没有参数，也不必管
                        functionNode.params
                }
                else {
                    fnIndex   = 1
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

                    if (outputLog) {
                        var firstArg = fnIndex === 0 ? '' : '"' + argumentsNode[0].value + '", '
                        log(filePath,
                            node._parentNode.object.name + '.' + content +
                            '(' + firstArg + 'function(' + elements.map(function (elem) {
                                return elem.value
                            }).join(',') + '){...})'
                        )
                    }

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
                var isDirectiveController, isProvider$get
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
                    else if (propertyNode._parentNode._parentNode._parentNode._parentNode._parentNode._parentNode.expression.callee.property.name === 'provider') {
                        isProvider$get = true
                    }
                }
                catch (e) {
                }

                if (!isDirectiveController && !isProvider$get) return

                var elements = propertyNode.value.params.map(function (param) {
                    return {
                        type:  'Literal',
                        value: param.name,
                        raw:   '"' + param.name + '"'
                    }
                })

                if (outputLog)
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
            traversal(n, info.contentKey, node, filePath, outputLog)
        })
    })
}

function log(filePath, msg) {
    console.log(colors.blue('[Inject]') + ' in file: `' + colors.green(filePath) + '` :')
    console.log('    ' + msg)
}