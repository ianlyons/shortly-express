var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var bcrypt = require('bcrypt-nodejs');

var app = express();

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(partials());
  app.use(express.bodyParser());
  app.use(express.cookieParser('oatmealraisin'));
  app.use(express.session());
  app.use(express.static(__dirname + '/public'));
});

app.get('/', function(req, res) {
  res.render('index');
});

app.get('/create', function(req, res) {
  res.render('index');
});

app.get('/links', function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.get('/login', function(req, res) {
  res.render('index');
});

app.get('/signup', function(req, res) {
  res.render('index');
});

app.post('/links', function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.post('/signup', function(req, res){
  console.log('processing post request to signup');
  var usrObj = {
    username: req.body.username,
    password: req.body.password
  };
  new User(usrObj).fetch().then(function(){
    db.knex('users').where("username","=", usrObj.username).then(function(data) {
      if (data.length){
        //TODO: Inform end user that username already exists
        res.send(200, 'Bro you already exist, seriously, seriously, stop');
      } else {
        var user = new User(usrObj);
        user.save().then(function(newUser){
          Users.add(newUser);
          console.log(newUser);
          // add successful auth cookie to the response
          req.session.regenerate(function(err) {
          console.log("Generating session cookie...");
            req.session.username = username;
            res.redirect('/');
          });
        });
      }
    });
  });
});

app.post('/login', function(req, res){
  console.log('processing post request to login');
  var username = req.body.username;
  var password = req.body.password;
  var hashPass = bcrypt.hashSync(password);
  db.knex('users').where('username', '=', username)
    .then(function(data){
      console.log('returned user data from query: ');
      console.log(data);
      if(bcrypt.compareSync(password, data[0].password)) {
        console.log("Same password! generate session and redirect to index");
        req.session.regenerate(function(err) {
          console.log("Generating session cookie...");
          req.session.username = username;
          res.redirect('/');
        });
      } else {
        res.redirect('/login');
      }
    });
});


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});


console.log('Shortly is listening on 4568');
app.listen(4568);
