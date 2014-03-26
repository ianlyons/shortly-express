/* global require */

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
var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;

var app = express();

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(partials());
  app.use(express.bodyParser());
  app.use(express.cookieParser('oatmealraisin'));
  app.use(express.session());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(express.static(__dirname + '/public'));
});

passport.use(new GitHubStrategy({
    clientID: '6c8a2e3f445bd40c848f',
    clientSecret: 'c36a777c13ca13ffcac039174df41cfcb3c4940b',
    callbackURL: "http://127.0.0.1:4568/login/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // console.log('accessToken: '+ accessToken);
    // console.log('refreshToken: '+refreshToken);
    console.log('profile: '+profile.id);
    // console.log('done: '+done);
    var profileId = profile.id;
    var githubUser = { githubId: profileId };
    var user = new User();
    user.findOrCreate(githubUser, function (err, user) {
      console.log('hitting the passport.use callback with user object: '+user);
      return done(err, user);
    });
  }
));

app.get('/login/github', passport.authenticate('github'));

app.get('/login/github/callback',
  passport.authenticate('github', {failureRedirect: '/login'}),
  function(req, res){
    console.log('hitting the get callback');
    res.redirect('/');
  });

app.get('/', util.checkAuth, function(req, res) {
  res.render('index');
});

app.get('/create', util.checkAuth, function(req, res) {
  res.render('index');
});

app.get('/links', function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/logout', function(req, res) {
  req.session.destroy(function() {
    res.redirect('/login');
  });
});

app.get('/signup', function(req, res) {
  res.render('signup');
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

      console.log('Returned user data from query.');
      if(bcrypt.compareSync(password, data[0].password)) {
        // change bcrypt to Async
        console.log("Same password! Generate session and redirect to index");
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
