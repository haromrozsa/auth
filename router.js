const Authentication = require('./controllers/authentication');
const passportService = require('./services/passport');
const passport = require('passport');
const Symbols = require('./controllers/generation');

const requireAuth = passport.authenticate('jwt', { session: false});
const requiresSignin = passport.authenticate('local', { session: false});

module.exports = function(app) {
  //app.get('/', function(req, res, next) {
  //  res.send(['waterbottel', 'phone']);
  //});
  app.get('/', requireAuth, function(req, res) {
    res.send({ message: 'Super secret code is ABC123'});
  });
  app.post('/signin', requiresSignin, Authentication.signin);
  app.post('/signup', Authentication.signup);
  app.post('/save', Symbols.save);
  app.post('/symbol', Symbols.get);

}
