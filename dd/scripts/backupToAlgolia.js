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

// copy data from firebase to algolia -- backup purpose only
db.ref().child('data').once('value', data => {

	const records = [];
	data.forEach(datum => {

		datum.forEach(miniDatum => {

			miniDatum.forEach(microDatum => {

				const childKey = microDatum.key;
				const childData = microDatum.val();
		
				childData.objectID = childKey;
		
				records.push(childData);

			})

		});
	});

	algIndex
	.saveObjects(records)
	.then(() => {
		console.log('Firebase -> Algolia import complete');
		process.exit(1);
	})
	.catch(error => {
		console.log('Oops! Firebase -> Algolia didnt succeed');
		process.exit(1);
	})

});