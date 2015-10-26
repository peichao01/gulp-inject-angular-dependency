var contentMap = {
    'Program': {
        contentKey: 'body',
    },
    'VariableDeclaration': {
        contentKey: 'declarations',
    },
    'ExpressionStatement': {
        contentKey: 'expression',
    },
    'CallExpression': [{
        contentKey: 'callee',
    },{
        contentKey: 'arguments',
    }],
    'MemberExpression': [{
        contentKey: 'object',
    }, {
        contentKey: 'property',
    }],
    'Identifier': {
        contentKey: 'name',
    },
    'Literal': {
        contentKey: 'value',
    },
    'FunctionExpression': [{
        contentKey: 'params',
    }, {
        contentKey: 'body',
    }],
    'BlockStatement': {
        contentKey: 'body',
    },
    'ReturnStatement': {
        contentKey: 'argument',
    },
    'ObjectExpression': {
        contentKey: 'properties',
    },
    'Property': [{
        contentKey: 'key',
    }, {
        contentKey: 'value',
    }],
    'ArrayExpression':{
        contentKey: 'elements'
    },
    'VariableDeclarator': [{
        contentKey: 'id'
    }, {
        contentKey: 'init'
    }],
    'FunctionDeclaration': [{
        contentKey: 'id'
    }, {
        contentKey: 'params'
    }, {
        contentKey: 'body'
    }],
    'AssignmentExpression': [{
        contentKey: 'left'
    }, {
        contentKey: 'right'
    }],
    'LogicalExpression': [{
        contentKey: 'left'
    }, {
        contentKey: 'right'
    }],
    'IfStatement': [{
        contentKey: 'test'
    }, {
        contentKey: 'consequent'
    }],
    'ThisExpression': {
        contentKey: null
    },
    'BinaryExpression': [{
        contentKey: 'left'
    }, {
        contentKey: 'right'
    }],
    'UnaryExpression': {
        contentKey: 'argument'
    },
    'SwitchStatement': [{
        contentKey: 'discriminant'
    }, {
        contentKey: 'cases'
    }],
    'SwitchCase': [{
        contentKey: 'consequent'
    }, {
        contentKey: 'test'
    }],
    'BreakStatement': {
        contentKey: null
    },
    'ConditionalExpression': [{
        contentKey: 'test'
    }, {
        contentKey: 'consequent'
    }, {
        contentKey: 'alternate'
    }],
    'ThrowStatement': {
        contentKey: 'argument'
    },
    'NewExpression': [{
        contentKey: 'callee'
    }, {
        contentKey: 'arguments'
    }],
    'UpdateExpression': {
        contentKey: 'argument'
    },
    'ForStatement': [{
        contentKey: 'init'
    }, {
        contentKey: 'test'
    }, {
        contentKey: 'update'
    }, {
        contentKey: 'body'
    }],
    'WhileStatement': [{
        contentKey: 'test'
    }, {
        contentKey: 'body'
    }],
    'DoWhileStatement': [{
        contentKey: 'body'
    }, {
        contentKey: 'test'
    }],
    'ForInStatement': [{
        contentKey: 'left'
    }, {
        contentKey: 'right'
    }, {
        contentKey: 'body'
    }],
    'TryStatement': [{
        contentKey: 'block'
    }, {
        contentKey: 'handler'
    }, {
        contentKey: 'guardedHandlers'
    }],
    'CatchClause': [{
        contentKey: 'param'
    }, {
        contentKey: 'guard'
    }, {
        contentKey: 'body'
    }],
    'ContinueStatement': {
        contentKey: null
    },
    'SequenceExpression': {
        contentKey: 'expressions'
    },
    'LabeledStatement': [{
        contentKey: 'body'
    }, {
        contentKey: 'label'
    }],
    'EmptyStatement': {
        contentKey: null
    }
}

module.exports = contentMap