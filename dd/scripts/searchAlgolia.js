require('dotenv').config();

// firebase config
const firebase = require('firebase');

var config = {
    apiKey: process.env.APIKEY,
    authDomain: process.env.AUTHDOMAIN,
    databaseURL: process.env.DBURL,
    projectId: process.env.PROJECTID,
    storageBucket: process.env.STORAGEBCKT,
    messagingSenderId: process.env.MSID
  };

var fbapp = firebase.initializeApp(config);
var db = fbapp.database();
var auth = fbapp.auth();

// algolia config
const algoliasearch = require('algoliasearch');

const algolia = algoliasearch(
	process.env.ALGOLIA_APP_ID,
	process.env.ALGOLIA_API_KEY
);

const algIndex = algolia.initIndex(process.env.ALGOLIA_INDEX_NAME);

algIndex.search("srm", {
 "hitsPerPage": 10,
 "page": 0,
 "analytics": false,
 "attributesToRetrieve": "*",
 "getRankingInfo": true,
 "responseFields": "*",
 "facets": []
},
function searchDone(err, content) {
	if (err) throw err;

	let searchResults = content;
	console.log(searchResults);
	process.exit()
})