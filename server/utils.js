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

var censor = function(message) {
  for (var key in censoredWords) {
    message = message.replace(new RegExp(key, 'gi'), censoredWords[key]);
  }
  return message;
};

var extractHashtags = function(message) {
  if (message.indexOf('#')) {
    var hashtags = message.split('#').slice(1);
      for (var i = 0; i < hashtags.length; i++) {
        hashtags[i].trim();
        hashtags[i] = hashtags[i].split(" ")[0];
      }

      return hashtags;
  }
}

