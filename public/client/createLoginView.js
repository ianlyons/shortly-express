Shortly.createLoginView = Backbone.View.extend({
  className: 'login-form',

  template: Templates['login'],

  events: {
    'submit': 'processLogin'
  },

  render: function() {
    this.$el.html( this.template() );
    return this;
  },

  processLogin: function(e) {
    e.preventDefault();
    var $username = this.$el.find('form #username');
    var $password = this.$el.find('form #password');
    var user = new Shortly.User({
      username: $username.val(),
      password: $password.val(),
      urlR : '/login'
    });
    user.on('request', this.startSpinner, this);
    user.on('sync', this.success, this);
    user.on('error', this.failure, this);
    user.save({});
  },

  success: function(link) {
    this.stopSpinner();
    var view = new Shortly.LinkView({ model: link });
    this.$el.find('.message').append(view.render().$el.hide().fadeIn());
  },

  failure: function(model, res) {
    this.stopSpinner();
    this.$el.find('.message')
      .html('Please enter a valid URL')
      .addClass('error');
    return this;
  },

  startSpinner: function() {
    this.$el.find('img').show();
    this.$el.find('form input[type=submit]').attr('disabled', 'true');
    this.$el.find('.message')
      .html('')
      .removeClass('error');
  },

  stopSpinner: function() {
    this.$el.find('img').fadeOut('fast');
    this.$el.find('form input[type=submit]').attr('disabled', null);
    this.$el.find('.message')
      .html('')
      .removeClass('error');
  }
});
