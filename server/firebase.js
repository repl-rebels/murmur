var Firebase = require('firebase');
var myDataRef = new Firebase('https://radiant-heat-7333.firebaseio.com/');
var tokenFactory = require('./firebaseTokenFactory').tokenFactory;
var Cookies = require('cookies');
var httpRequest = require('request');

var freshPost = myDataRef.child('Fresh Post');

// var setTokenCookie = exports.setTokenCookie = function (request, response, token){
//   newtoken = tokenFactory();
//   if(token !== undefined){
//     newToken = token;
//   }
//   response.cookies.set('token', newToken, {
//     maxAge: 2628000000,   // expires in 1 month
//     httpOnly: false,    // more secure but then can't access from client
//   });
//   response.send("MurMur'd");
// };

var censoredWords = {
  hate: 'love',
  kill: 'hug',
  crap: 'carp',
  darn: 'donkey',
  idiot: 'iguana',
  fuck: 'frog',
  bitch: 'bee',
  shit: 'squirrel',
  damn: 'doggie',
  hell: 'hippopotamus',
  cunt: 'crocodile'
};

var censor = exports.censor = function(string) {
  for (var key in censoredWords) {
    string = string.replace(new RegExp(key, 'gi'), censoredWords[key]);
  }
  return string;
};


var insertPost = exports.insertPost = function(request, response, dataRef) {
  var dataRef = dataRef || freshPost; //dataRef doesnt get passed, so dataRef=freshPost
  var token = request.cookies.get('token') || request.body.token; // body.token is for Slack
  var newToken;
  var newJwtClaims;

  if (token) {
    dataRef.authWithCustomToken(token, function(error, authData) {
      if (error) {
        console.log("Login Failed! @31 with token: ", token, "and error message...", error);
      } else {
        var postMessage = request.body.message;
        var post = dataRef.push(); //ID generator
        var postId = post.key(); //Grabs the ID...eg(JzSSocAObWXssweuiJP)
        //
        //0.censor message
        postMessage = censor(postMessage);
        //
        //retrieve hashtag from message
        var hashtags;
        if(postMessage.indexOf('#')){
          hashtags = postMessage.split('#').slice(1);
          for(var i = 0; i < hashtags.length; i++){
            hashtags[i].trim();
            hashtags[i] = hashtags[i].split(' ')[0];
          }
        }
        if(hashtags.length=== 0){
          hashtags[0] = '';
        }

        //1.store messages to FireBase with these key/value pairs.
        post.set({ //Pushes the post data into the database
          uid: authData.auth.uid, //the guid generated from firebaseTokenFactory.a random 37-char guid. eg('74c11731-c901-9e4e-331d-61e983a4fbb5')
          messageId: postId,
          message: postMessage,
          timestamp: Firebase.ServerValue.TIMESTAMP,
          votes: 0,
          comments: "no comments",
          city: request.body.city,
          hashtag: hashtags[0],
        });


        var fbRef = dataRef.parent();
        var postIdRef = fbRef.child('sessions/' + authData.auth.uid + '/posted/' + postId);
        //
        //2. storage user session info to FireBase so that it can be used for voting/'my posts'
        postIdRef.set({
          type: 'true'
        });


        var url = 'https://mks22.slack.com/api/chat.postMessage';
        var slackMessage = {
          token: 'xoxb-10846461925-JOzhsdWjZcydjD8pERpuPyi8',
          channel: '#mur_mur',
          text: postMessage,
          username: 'MurMur Rebel-Bot'
        };
        var formattedMessage = {
          form: slackMessage
        };
        var callback = function(err, data) {
          if (err) {
            console.log('Slack Message Not Sent! Err:', err);
          } else {
            console.log('Slack Message Posted');
          }
        };
        //
        //3. sends message to Slack Server
        httpRequest.post(url, formattedMessage, callback);

        // newJwtClaims = authData.auth;
        // newJwtClaims.postedMessagesId = newJwtClaims.postedMessagesId + 1;
        // newToken = tokenFactory(newJwtClaims);
        //set a Token Cookie everytime the user posts a message
        // setTokenCookie(request, response, newToken);
      }
    });
  }
  // return { newToken: newToken, auth: newJwtClaims };
};

var votePost = exports.votePost = function(request, response, dataRef) {
  var dataRef = dataRef || freshPost;
  var token = request.cookies.get('token');
  var newToken;
  var newJwtClaims;

  if (token) {

    dataRef.authWithCustomToken(token, function(error, authData) {
      if (error) {
        console.log("Login Failed!", error);
      } else {
        var dataRef = dataRef || freshPost;
        var messageId = request.body.messageId;
        var voteRequest = request.body.vote;

        var fbRef = freshPost.parent();
        var votedIdRef = fbRef.child('sessions/' + authData.auth.uid + '/voted/' + messageId);

        var vote = dataRef.child(messageId + '/votes');

        votedIdRef.once('value', function(snapshot) {
          if (snapshot.val()) {
            var value = snapshot.val();

            if (value.type === "downvoted") {
              vote.transaction(function(value) {
                if (voteRequest === true) {
                  votedIdRef.set(null);
                  return value + 1;
                }
              });
            } else {
              vote.transaction(function(value) {
                if (voteRequest === false) {
                  votedIdRef.set(null);
                  return value - 1;
                }
              });
            }
          } else {
            vote.transaction(function(value) {
              if (voteRequest === true) {
                votedIdRef.set({
                  type: "upvoted"
                });
                return value + 1;
              } else {
                votedIdRef.set({
                  type: "downvoted"
                });
                return value - 1;
              }
            });
          }
        });

        // newJwtClaims = authData.auth;
        // newJwtClaims.postedMessagesId = newJwtClaims.postedMessagesId + 1;
        // newToken = tokenFactory(newJwtClaims);

        // setTokenCookie(request, response, newToken);
      }
    });
  } else {
    response.sendStatus(404); // look up right error code later
  }
};

var comment = exports.comment = function(request, response, dataRef) {
  var dataRef = dataRef || freshPost;
  var token = request.body.token;

  dataRef.authWithCustomToken(token, function(error, authData) {
    if (error) {
      console.log("Login Failed!", error);
    } else {
      var messageId = request.body.messageId; //The post/message ID where the comment resides
      var commentMessage = censor(request.body.comment);
      var comments = dataRef.child(messageId + '/comments');

      var comment = comments.push(); //ID generator
      var commentId = comment.key(); //Grabs the ID

      var postedRef = dataRef.parent().child('sessions/' + authData.auth.uid + '/posted');

      postedRef.once('value', function(snapshot) {
        //if Commenter is OP
        if (snapshot.val() && snapshot.val().hasOwnProperty(messageId)) {
          authData.auth.baseId = 'OP'; //Todo: create OP image
          authData.auth.hairId = 'OP'; //Todo: create OP image
        }

        //Pushes the comment data into the post/message
        comment.set({
          commentId: commentId,
          comment: commentMessage,
          timestamp: Firebase.ServerValue.TIMESTAMP,
          votes: 0,
          baseId: authData.auth.baseId,
          hairId: authData.auth.hairId
        });
      });
    }
  });
};

var voteComment = exports.voteComment = function(request, response, dataRef) {
  var dataRef = dataRef || freshPost;
  var token = request.cookies.get('token');
  var newToken;
  var newJwtClaims;

  if (token) {
    dataRef.authWithCustomToken(token, function(error, authData) {
      if (error) {
        console.log("Login Failed!", error);
      } else {
        var messageId = request.body.messageId;
        var commentId = request.body.commentId;
        var voteRequest = request.body.vote;

        var fbRef = freshPost.parent();
        var votedIdRef = fbRef.child('sessions/' + authData.auth.uid + '/voted/' + commentId);

        var vote = dataRef.child(messageId + '/comments/' + commentId + '/votes');

        votedIdRef.once('value', function(snapshot) {
          if (snapshot.val()) {
            var value = snapshot.val();

            if (value.type === "downvoted") {
              vote.transaction(function(value) {
                if (voteRequest === true) {
                  votedIdRef.set(null);
                  return value + 1;
                }
              });
            } else {
              vote.transaction(function(value) {
                if (voteRequest === false) {
                  votedIdRef.set(null);
                  return value - 1;
                }
              });
            }
          } else {
            vote.transaction(function(value) {
              if (voteRequest === true) {
                votedIdRef.set({
                  type: "upvoted"
                });
                return value + 1;
              } else {
                votedIdRef.set({
                  type: "downvoted"
                });
                return value - 1;
              }
            });
          }
        });

        // newJwtClaims = authData.auth;
        // newJwtClaims.postedMessagesId = newJwtClaims.postedMessagesId + 1;
        // newToken = tokenFactory(newJwtClaims);

        // setTokenCookie(request, response, newToken);
      }
    });
  }
};

var toggleFavorite = exports.toggleFavorite = function(request, response, dataRef) {
  var dataRef = dataRef || freshPost;
  var token = request.cookies.get('token');
  var newToken;
  var newJwtClaims;

  if (token) {
    dataRef.authWithCustomToken(token, function(error, authData) {
      if (error) {
        console.log("Login Failed!", error);
      } else {
        var messageId = request.body.messageId;

        var fbRef = dataRef.parent();
        var favoritesIdRef = fbRef.child('sessions/' + authData.auth.uid + '/favorites/' + messageId);

        favoritesIdRef.once('value', function(snapshot) {
          if (snapshot.val()) {
            favoritesIdRef.set(null);
          } else {
            favoritesIdRef.set({
              type: 'true'
            });
          }
        });

        // newJwtClaims = authData.auth;
        // newJwtClaims.postedMessagesId = newJwtClaims.postedMessagesId + 1;
        // newToken = tokenFactory(newJwtClaims);

        // setTokenCookie(request, response, newToken);
      }
    });
  }
};
