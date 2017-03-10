require( 'dotenv' ).config( { path: '../.env' } )

const Telegraf = require( 'telegraf' )
const imdb = require('imdb-search')
const bot = new Telegraf( process.env.BOT_TOKEN )

const welcome = "Welcome to IMDB bot.\n\nType:\n/help"
const help = "Usage:\n\n\
@IMDBdbot 'movie name'\n\
/search \'movie name\'\n\
/source -- see the code behind IMDBbot\n\n\
Any bugs or suggestions, talk to: @farm_kun"

bot.command( 'start', ctx => {
	ctx.reply( welcome )
})

bot.command( 'help', ctx => {
	ctx.reply( help )
})

function removeCmd( ctx ) {
	return ctx.message.text.split(' ').slice( 1 ).join(' ')
}

/*	It's  not a pretty function, but when is typed 'gantz:o', :o turns out to be
	a  emoji.  Or  when  typed 'gantz:0', the IMDB API return 'gantz' only, they
	have to be 'gantz:o'
*/
function messageToString( message ) {
	return Buffer
		  .from( message, 'ascii' )
		  .toString( 'ascii' )
		  .replace( /(?:=\(|:0|:o|: o|: 0)/, ': o' )
}

bot.command( 'search', ctx => {
	const movie = messageToString( removeCmd( ctx ) )

	imdb.search( movie ).then( response =>
		ctx.reply( 'http://www.imdb.com/title/' + response[ 0 ].imdb ) )
	.catch( reason => console.log( 'Reject promise in search: ', reason ) )
} )

bot.command( 'source', ctx => {
	ctx.reply( 'https://github.com/Fazendaaa/imdb_bot_telegram' )
})

function verifyData( data ) {
	return ( null != data && undefined != data ) ? data : 'Not avaliable'
}

function replyMarkdown( data ) {
	const rating = verifyData( data.imdb.rating )
	const metacritic = verifyData( data.metacritic )
	const rotten = ( undefined != data.tomato ) ? ( null != data.tomato.url ? data.tomato.url : 'Not avaliable' ) : 'Not avaliable'
	const message = ( 'Not avaliable' != rotten ) ? 'here' : 'Not avaliable'

	return `[${data.title}](${'http://www.imdb.com/title/' + data.imdb.id})
- _Rating_: *${rating}*
- _Metacritic_: *${metacritic}*
- _RottenTomatoes_: [${message}](${rotten})`
}

function replyInline( data ) {
	const poster = ( null != data.poster ) ? data.poster : 'http://bit.ly/2moqQnT'
	const plot = ( undefined != data.plot ) ? data.plot : 'No plot avaliable'

	return {
		id: data.imdb.id,
		title: data.title,
		type: 'article',
		input_message_content: {
			message_text: replyMarkdown( data ),
			parse_mode: 'Markdown'
		},
		description: plot,
		thumb_url: poster,
	}
}

function uniq( array ) {
	const lookup = {}

	return array.filter( data => {
		   		if( !( data.id in lookup ) ) {
		   			lookup[ data.id ] = 1
		   			return true
		   		}
		   	} )
}

function __inlineSearch( array ) {
	return Promise
		   .all( array.map( data =>
			   imdb.get( data.id )
			   .then( movie => replyInline( movie ) )
			   .catch( issue => console.log( '__inlineSearch then: ', issue ) )
			) )
		   .catch( issue => console.log( '__inlineSearch Promise: ', issue ) )
}

function inlineSearch( movie ) {
	const notFound = {
						id: '0',
						title: 'Not Found',
						type: 'article',
						input_message_content: {
							message_text: 'http://www.imdb.com',
							parse_mode: 'HTML'
						},
						description: 'Content not found',
						thumb_url: 'http://bit.ly/2moqQnT'
					}

	return imdb.search( movie )
		  .then( result => __inlineSearch( result ) )
		  .catch( issue => {
		      console.log( 'inlineSearch: ', issue )
		  	  if ( 'Movie not found!' === issue )
		  	      return [ notFound ]
		  } )
}

bot.on( 'inline_query', ctx => {
	const movie = messageToString( ctx.inlineQuery.query ) || ''

	inlineSearch( movie )
	.then( response => ctx.answerInlineQuery( uniq( response ) ) )
	.catch( issue => console.log( 'inline_query: ', issue ) )
} )

bot.startPolling( )
