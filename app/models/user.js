var db = require('../config');
var Link = require('./link');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  links: function(){
    return this.hasMany(Link);
  },
  initialize: function(){
    this.on('creating', function(model, attrs, options){
      var hashPass = bcrypt.hashSync(model.get('password'));
      model.set('password', hashPass);
    });
  }
});

module.exports = User;
