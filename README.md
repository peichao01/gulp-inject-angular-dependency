# gulp-inject-angular-dependency
auto inject dependencies to angular controller/directive/etc. change the factory function to array with dependencies.


Usage:
------------

```javascript
var injectDependencyAsArray = require('gulp-inject-angular-dependency')
gulp
    .task('inject-dependency', function(){
        gulp.src(paths.jsSource)
            .pipe(injectDependencyAsArray(function(path){
                if(path.indexOf('vendors') >= 0) return false
                return true
            }))
            .pipe(gulp.dest('./.middle/di/js/'))
    })
```

Note:
--------
```javascript
// only support the following two situation：

// 1.
 module.controller("name", function(){})
 module.directive("name", function(){})
 module.service("name", function(){})
 module.factory("name", function(){})
 module.config(function(){})
 module.run(function(){})

// 2. 
// controller in directive definition:

module.directive("name", function(){
  return {
    restrict: '',
    controller: function(){}
  }
})

// $get in provider definition:

module.provider("name", function(){
  return {
    $get: function($http){}
  }
}


// 2.1 
// only support stationary code structure:

module.directive('xx', function(){
  return {
    restrict: '',
    controller: function($scope, ...){}
  }
})

// not support others like:

module.directive('xx', function(){
  var tmp = {}
  tmp.restrict = ''
  tmp.controller = function($scope, ...){}
  return tmp
})
```
