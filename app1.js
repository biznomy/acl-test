var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var mongoose = require('mongoose');
var acl = require('acl');



var index = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


var dbconnection = mongoose.connect("mongodb://localhost:27017/test", {"useMongoClient" : true}, function(err) {
  if(err) console.log('MongoDb: Connection error: ' + err);
})


var nodeAcl;
var route123 = express.Router();

/* GET home page. */
route123.get('/', function(req, res, next) {
  // res.render('index', { title: 'Express' });
  res.send("parse Called");
});
mongoose.connection.on('open', function (ref) {
  console.log('Connected to mongo server.');
  nodeAcl = new acl(new acl.mongodbBackend(mongoose.connection.db, 'acl_'));
// allow guests to view posts
nodeAcl.allow([{
  roles: 'admin',
  allows: [{
    resources: '/admin',
    permissions: '*',
  }],
}, {
  roles: 'user',
  allows: [{
    resources: '/dashboard',
    permissions: 'get',
  }],
}, {
  roles: 'guest',
  allows: [],
}])

// Inherit roles
//  Every user is allowed to do what guests do
//  Every admin is allowed to do what users do
nodeAcl.addRoleParents('user', 'guest')
nodeAcl.addRoleParents('admin', 'user')

nodeAcl.addUserRoles(1, 'admin')
nodeAcl.addUserRoles(2, 'user')
nodeAcl.addUserRoles(0, 'guest')

nodeAcl.roleUsers('user',function(err,users){
  console.log(users)
})
nodeAcl.roleUsers('admin',function(err,users){
  console.log(users)
})

});
mongoose.connection.on('error', function (err) {
  console.log('Could not connect to mongo server!');
  console.log(err);
});


app.use('/', index);
app.use('/users', users);
app.use('/parse', route123);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
