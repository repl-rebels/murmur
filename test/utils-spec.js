
describe('Utils Censor Function', function() {

	it('Should replace darn with donkey', function() {
		var funny = censor('darn')

		expect(funny).toEqual('donkey');
	});

	it('Should replace crap with carp', function() {
		var funny = censor('crap');

		expect(funny).toEqual('carp');
	});

	it('Should replace idiot with iguana', function() {
		var funny = censor('idiot');

		expect(funny).toEqual('iguana');	
	});
});

describe('Utils Extract Hashtag Function', function() {

	it('Should extract correctly if one hashtag present', function() {
		var hashtags = extractHashtags('i love #cats !');

		expect(hashtags).toEqual(['cats']);
	});

	it('Should extract correctly if multiple hashtags present', function() {
		var hashtags = extractHashtags('i love #cats and i love #dogs !');
		
		expect(hashtags).toEqual(['cats', 'dogs']);
	});

	it('Should not extract words around the hashtag', function() {
		var hashtags = extractHashtags('only #this should be tagged');

		expect(hashtags).toEqual(['this']);
	})
})

