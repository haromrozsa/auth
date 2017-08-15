const Authentication = require('./controllers/authentication');
const passportService = require('./services/passport');
const passport = require('passport');
const Historical = require('./controllers/historical');

const requireAuth = passport.authenticate('jwt', { session: false});
const requiresSignin = passport.authenticate('local', { session: false});

module.exports = function(app) {
  app.get('/', requireAuth, function(req, res) {
    res.send({ message: 'Super secret code is ABC123'});
  });
  app.post('/signin', requiresSignin, Authentication.signin);
  app.post('/signup', Authentication.signup);
  app.post('/security/historical/monthly', Historical.getOrCreateMonthly);
  app.post('/security/historical/weekly', Historical.getOrCreateWeekly);
}
