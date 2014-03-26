var db = require('../config');
var Link = require('./link');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var Users = require('../collections/users');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  links: function(){
    return this.hasMany(Link);
  },
  initialize: function(){
    // this.on('creating', function(model, attrs, options){
    //   var hashPass = bcrypt.hashSync(model.get('password'));
    //   model.set('password', hashPass);
    // });
  },
  findOrCreate : function(obj, callback){
    console.log(obj);
    var githubId = obj.githubId;

    db.knex('users').where('username', '=', githubId)
      .then(function(data){
        console.log('Returned from Github ID Query');
        if (data.length) {
          console.log('Github user was found');
          callback(null, data[0]);
        } else {
          console.log('Github user doesn\'t exist insert him!');
          var gitUser = new User({username: githubId});
          gitUser.save().then(function(newUser){
            // console.log(Users);
            this.collection.add(newUser);
            console.log(newUser);
            callback(null, newUser);
          });
        }
      });
  }



  //   var username = req.body.username;
  //   var password = req.body.password;
  //   var hashPass = bcrypt.hashSync(password);
  //   db.knex('users').where('username', '=', username)
  //     .then(function(data){

  //       console.log('Returned user data from query.');
  //       if(bcrypt.compareSync(password, data[0].password)) {
  //         // change bcrypt to Async
  //         console.log("Same password! Generate session and redirect to index");
  //         req.session.regenerate(function(err) {
  //           console.log("Generating session cookie...");
  //           req.session.username = username;
  //           res.redirect('/');
  //         });
  //       } else {
  //         res.redirect('/login');
  //       }
  //     });

});

module.exports = User;
