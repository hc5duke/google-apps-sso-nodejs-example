var express        = require('express'),
    util           = require('util'),
    passport       = require('passport'),
    config         = require('./config'),
    GoogleStrategy = require('passport-google').Strategy;

util.debug("starting...");

/*
TODO, add the openid + oauth hybrid parameters
openid.ns.ext2 = "http://specs.openid.net/extensions/oauth/1.0"
openid.ext2.consumer  = "www.example.com"
openid.ext2.scope =
 */

var app = express.createServer();

//configure Express
app.configure(function() {
  app.register('.html', require('jade'));
  app.set("view options", { layout: false });
  app.use(express.static(__dirname + '/public'));
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'sdflnakfdhewofudqwoasheqwkjabdskqwah' }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
});

//Passport session setup.
//To support persistent login sessions, Passport needs to be able to
//serialize users into and deserialize users out of the session.  Typically,
//this will be as simple as storing the user ID when serializing, and finding
//the user by ID when deserializing.  However, since this example does not
//have a database of user records, the complete Google profile is serialized
//and deserialized.
passport.serializeUser(function(user, done) {
done(null, user);
});

passport.deserializeUser(function(obj, done) {
done(null, obj);
});

var createStrategy = function(def){
  var strategy = new GoogleStrategy({
    returnURL:   def.realm + '/auth/return/' + def.name,
    realm:       def.realm,
    secure:      false,
    providerURL: 'https://www.google.com/accounts/o8/site-xrds?hd=' + def.domain,
  },
  function(identifier, profile, done) {
    process.nextTick(function () {    // asynchronous verification, for effect...
      profile.identifier = identifier;
      return done(null, profile);
    });
  });
  strategy.name = def.name;
  return strategy;
}

//configure passport strategies from the config file
util.debug("Loading strategies");
var strategy_defs = config.defs;
var __default;

for(key in strategy_defs){
  def = strategy_defs[key];
  util.debug("Loading strategy: " + def.name);
  def.strategy = createStrategy(def);
  if(def.__default) __default = def.name;
  passport.use(def.strategy);
}




//Redirect the user to Google for authentication.  When complete, Google
//will redirect the user back to the application at
///auth/return/:id
app.get('/auth/initiate/default', function(req, res) {
  passport.authenticate(__default)(req, res);
});

app.get('/auth/initiate/:id', function(req, res) {
  passport.authenticate(req.params.id)(req, res);
});
//same as above but configured to work with googles universal naviation link
// as defined in the ApplicationManifest /googlenav?domain=${DOMAIN_NAME}
app.get('/googlenav', function(req, res) {
  passport.authenticate("production_" + req.query["domain"])(req, res);
});


//Google will redirect the user to this URL after authentication.  Finish
//the process by verifying the assertion.  If valid, the user will be
//logged in.  Otherwise, authentication has failed.
app.get('/auth/return/:id', function(req, res) {
  passport.authenticate(req.params.id, {
    successRedirect: '/',
    failureRedirect: '/' })(req, res);
});


app.get('/', function(req, res){
  if(req.isAuthenticated()){
    res.render("indexPrivate.html", {defs: config.defs, user: req.user, data: JSON.stringify(req.user) });
  }else{
    res.render("indexPublic.html",  {defs: config.defs});
  }
});

app.get('account', function(req, res){
  res.render('account.html', { data: JSON.stringify(req.user) });
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
