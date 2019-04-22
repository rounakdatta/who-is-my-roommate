'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const request = require('request');
const schedule = require('node-schedule');
require('dotenv').config();

const cookieParser = require('cookie-parser');
const session = require('express-session');

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

// changes to the 'data' table listener
const hostelListener = db.ref().child('data');

hostelListener.on('child_added', addOrUpdateRecord);
hostelListener.on('child_changed', addOrUpdateRecord);
hostelListener.on('child_removed', deleteRecord);

function addOrUpdateRecord(payload) {

	const records = [];
	payload.forEach(datum => {


			datum.forEach(microDatum => {

				const childKey = microDatum.key;
				const childData = microDatum.val();
		
				childData.objectID = childKey;
		
				records.push(childData);

			});
	});

	algIndex
	.saveObjects(records)
	.then(() => {
		console.log('New addition/updation on Algolia!', records.objectID);
	})
	.catch(error => {
		console.log('Error while addition/updation on Algolia!', error);
	});
}

function deleteRecord(payload) {
	const objectID = payload.key;

	algIndex
	.deleteObject(objectID)
	.then(() => {
		console.log('New deletion on Algolia!', objectID);
	})
	.catch(error => {
		console.log('Error while deletion on Algolia!', error);
	});
}

// keepalive ping hacks
function rememberMyServer(uri) {
 	https.get(uri, (resp) => {
 		console.log(uri + ' - alive!');
 	}).on('error', (err) => {
 		console.log(uri + ' - dead! emergency!');
 	});
}

var keepalive = schedule.scheduleJob('*/10 * * * *', function() {

	var allMyServers = ['https://repl1.hostelroo.ml', 'https://repl2.hostelroo.ml', 'https://repl3.hostelroo.ml', 'https://repl4.hostelroo.ml', 'https://repl5.hostelroo.ml', 'https://repl6.hostelroo.ml'];
	for(var i = 0; i < allMyServers.length; i++) {
		rememberMyServer(allMyServers[i]);
	}
})

// app body-parser config
const app = express()

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

app.use(express.static(path.resolve(`${__dirname}/web/public`)));
console.log(`${__dirname}/web`);
app.use('*', (req, res, next) => {
  console.log(`URL: ${req.baseUrl}`);
  next();
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept,X-access-token');
  next();
});

app.use((err, req, res, next) => {
  if (err) {
    res.send(err);
  }
});

app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.use(express.static(__dirname + '/views/web/public'));

// app cookie-parser config
app.use(cookieParser());
app.use(session({secret: 'nErDsFoRnErDs'}));

// APIs start here
// home page
app.get('/', (req, res) => {
  res.render('web/public/index.html');
});

// logout API
app.get('/logout', function(req, res) {
	auth.signOut();
	res.clearCookie('currentUser');
	return res.redirect('/');
});

// register API
app.get('/register', function(req, res) {
	if (req.cookies.currentUser) {
		return res.redirect('/userdashboard');
	} else {
		res.render('web/public/register.html');
	}
});

app.post('/register', function(req, res) {
	var email = req.body.email;
	var pwd = req.body.pwd;

	let partialEmail = email.substring(0, email.length - 15);

	var headers = {
			'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:65.0) Gecko/20100101 Firefox/65.0',
			'Accept': '*/*',
			'Accept-Language': 'en-US,en;q=0.5',
			'Referer': 'https://accounts.google.com/signin/v2/identifier?flowName=GlifWebSignIn&flowEntry=ServiceLogin',
			'X-Same-Domain': '1',
			'Google-Accounts-XSRF': '1',
			'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
			'DNT': '1',
			'Connection': 'keep-alive',
			'TE': 'Trailers',
			'Cookie': 'GAPS=1:cR3-j4ldBGP_4EegdUGk5yOz3Bg-HA:4ypANPCGrHQ-CN69; NID=160=O9_zclBQNifVLuQsP9F1848auaQ-a_e9HoVuweHYFzAxu-f0LfVsS-aHN63axGxCMGcGVvvJAayrsqpQMNJn2fhS2iIvpe5uX9lFW5Ye6sJfOOt0QFAVXA5CXRSHZEXaSjjhM3nAgIa0PDVPCv5Odj5Qosdvv-XB5UzmsMjZ4gc'
	};
	
	var dataString = 'continue=https%3A%2F%2Faccounts.google.com%2FManageAccount&f.req=%5B%22' + partialEmail + '%40srmuniv.edu.in%22%2C%22AEThLlz88BWYnv6dNMnDxQcZMJUoIl7LVEvw5uECB7VSDYJd6KHP0USW1a6BQ5KuyHYgpH_8VjQx3-JfC9sqwB7-wTOOYbrq8nbQACZnKwhTkqLLdVR0yYvhJH7uI2CzAJVLEPYcsfumoN5jBZUly1pkqtiAtLheU9Obol68voQFPqdSjTVBOy4%22%2C%5B%5D%2Cnull%2C%22IN%22%2Cnull%2Cnull%2C2%2Cfalse%2Ctrue%2C%5Bnull%2Cnull%2C%5B2%2C1%2Cnull%2C1%2C%22https%3A%2F%2Faccounts.google.com%2FServiceLogin%22%2Cnull%2C%5B%5D%2C4%2C%5B%5D%2C%22GlifWebSignIn%22%5D%2C1%2C%5Bnull%2Cnull%2C%5B%5D%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2C%5B%5D%2Cnull%2Cnull%2Cnull%2C%5B%5D%2C%5B%5D%5D%2Cnull%2Cnull%2Cnull%2Ctrue%5D%2C%22' + partialEmail + '%40srmuniv.edu.in%22%5D&bgRequest=%5B%22identifier%22%2C%22!39yl3P1CBnmRmyDahypEr3_mjqXLD_8CAAAAfFIAAAAMmQE_gNU_u3xVCSIMPLK1HG_0Q0M4r0SkYbdLi4K3V__7cemXr1mioNNFHii8s936OiJyEdNWiXJl7vs6nCU3oUMN3mEJBDTj4FeBcp2iwNFFi_61BhhCguZdKqgB1lXPaGmUUoILFjkNh24mA6-3ela65yRJoA3sZQ23ojpa8Mg8vk0yvTQcj57BBjxvG2va48gbwJUjZSBw5hbp7JuqUNyktgU3V3rrtVdPDEEMhtqzwV34kllESDrzRewcXPPQ-iVy62KWjHn8PKKXdsMcgAgttMs8DcHkUG0LVKrmcgFXzvWs9wAKpDa2cWoL_7XaP6hFOuaIEmBa1_4OR8tkgKoyDiYC7SkUBA3uwOJNOBHIq6_Y66Pbk3GvT9UKFyzOKhHTSZXRVx5alkwYxNhLQ8O7ji9sYuoZWGs1akD6fmFh0Q%22%5D&azt=AFoagUWpAVF4Tc7JMQ59-W0kONStyVzcmw%3A1550137987483&cookiesDisabled=false&deviceinfo=%5Bnull%2Cnull%2Cnull%2C%5B%5D%2Cnull%2C%22IN%22%2Cnull%2Cnull%2C%5B%5D%2C%22GlifWebSignIn%22%2Cnull%2C%5Bnull%2Cnull%2C%5B%5D%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2C%5B%5D%2Cnull%2Cnull%2Cnull%2C%5B%5D%2C%5B%5D%5D%5D&gmscoreversion=undefined&checkConnection=youtube%3A442%3A1&checkedDomains=youtube&pstMsg=1&';
	
	var options = {
			url: 'https://accounts.google.com/_/signin/sl/lookup?hl=en-GB&_reqid=55410&rt=j',
			method: 'POST',
			headers: headers,
			body: dataString
	};
	
	function callback(error, response, body) {
			if (!error && response.statusCode == 200) {
					var lengthOfResponse = body.length;
					if (lengthOfResponse < 700) {
						return res.send('Your email seems fishy and not official!')
					}

					auth.createUserWithEmailAndPassword(email, pwd)
					.then(function(userData) {
						console.log('registering and logging in');
						res.cookie('currentUser', auth.currentUser);
						return res.redirect('/userdashboard');
					})
					.catch(function(error) {
						if (error) {
							res.send(error);
						}
					});

			}
	}
	
	request(options, callback);	
});

// login API
app.get('/login', function(req, res) {
	if (req.cookies.currentUser) {
		return res.redirect('/userdashboard');
	} else {
		res.render('web/public/login.html');
	}
});

app.post('/login', function(req, res) {
	var email = req.body.email;
	var pwd = req.body.pwd;

	auth.signInWithEmailAndPassword(email, pwd)
	.then(function(userData) {
		console.log('logging in');
		res.cookie('currentUser', auth.currentUser);

		if (req.query['redirect'] != null) {
			var finalURL = req.query['redirect'].replace(/\s/g, "/");
			return res.redirect(finalURL);
		}

		return res.redirect('/userdashboard');
	})
	.catch(function(error) {
		if (error) {
			res.send(error);
		}
	});
});

app.get('/discussions', function(req, res) {
	res.render('web/public/discussions.html');
})

// user dashboard
app.get('/userdashboard', function(req, res) {
	if (req.cookies.currentUser) {

		db.ref().child("contributions").child(req.cookies.currentUser['uid']).once('value')
		.then( snapshot => {
			var coreUserData = []
			snapshot.forEach(function(childSnapshot) {

				coreUserData.push({"key": childSnapshot.key, "value": childSnapshot.val()});
			});
			return coreUserData;
		})
		.then(function(coreUserData) {
			res.render('web/public/dashboard.html', {coreUserData: JSON.stringify(coreUserData)});
		});

	} else {
		return res.send('Unauthorized');
	}
});

// redirection outside API
app.get('/redirect_out/:url', function(req, res) {
	res.redirect(req.params.url);
});

// user details API
app.get('/details/:hostelName/:roomNumber/:personId', function(req, res) {

	db.ref().child("data").child(req.params.hostelName).child(req.params.roomNumber).once('value')
	.then( snapshot => {
		var roomData = []
		snapshot.forEach(function(childSnapshot) {
			if (childSnapshot.key == req.params.personId) {
				roomData.push({"key": childSnapshot.key, "value": childSnapshot.val()});
			}
		});
		return roomData;
	})
	.then(function(roomData) {
		res.render('web/public/details.html', {"viewerStatus": req.cookies.currentUser, hostelName: req.params.hostelName, roomNumber: req.params.roomNumber, personId: req.params.personId, roomData: JSON.stringify(roomData)});
	});
});

// swap request API
app.get('/swap/request/:hostelName/:roomNumber/:personId', function(req, res) {

	if (req.cookies.currentUser) {


		var boysHostels = [];
		var girlsHostels = [];

		// synchronously get data from firebase using promises
		db.ref().child("hostels").child("male").once('value')
		.then( snapshot => {
			snapshot.forEach(function(childSnapshot) {
				var hostelData = childSnapshot.val();
				boysHostels.push(hostelData);
			});
			return boysHostels;
		})
		.then(function(boysHostels) {
			db.ref().child("hostels").child("female").once('value')
			.then( snapshot => {
				snapshot.forEach(function(childSnapshot) {
					var hostelData = childSnapshot.val();
					girlsHostels.push(hostelData);
				});
				return {
					boys: boysHostels,
					girls: girlsHostels
				}
			})
			.then(function(allHostels) {
				res.render('web/public/swapRequest.html', {"hostelName": req.params.hostelName, "roomNumber": req.params.roomNumber, "personId": req.params.personId, boysHostelsData: allHostels.boys, girlsHostelsData: allHostels.girls});
			})
		});

	} else {
		res.redirect('/login?redirect=swap+request+' + req.params.hostelName + '+' + req.params.roomNumber + '+' + req.params.personId);
	}

});

app.post('/swap/:hostelName/:roomNumber/:personId', function(req, res) {

	var currentTime = new Date();
	var currentOffset = currentTime.getTimezoneOffset();
	var ISTOffset = 330;   // IST offset UTC +5:30 
	var ISTTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset)*60000);
	var ddIST = ISTTime.getDate();
	var mmIST = ISTTime.getMonth() + 1;
	var yyyyIST = ISTTime.getFullYear();
	var hoursIST = ISTTime.getHours();
	var minutesIST = ISTTime.getMinutes();

	if(ddIST < 10) {
	    ddIST = '0' + ddIST;
	} 
	
	if(mmIST < 10) {
	    mmIST = '0' + mmIST;
	} 

	const swapDate = ddIST + "/" + mmIST + "/" + yyyyIST;
	const swapTime = hoursIST + ":" + minutesIST;

	if (req.cookies.currentUser) {

		var swapData = {
			swapDate: swapDate,
			swapTime: swapTime,
			'requestGivenBy': req.cookies.currentUser,
			'requestGivenTo': {'personId': req.params.personId, 'hostelName': req.params.hostelName, 'roomNumber': req.params.roomNumber},
			'personName': req.body.personName,
			'bookedRoomNumber': req.body.bookedRoomNumber,
			'gender': req.body.gender,
			'bookedHostelName': req.body.hostelName,
			'courseYear': req.body.courseYear,
			'contactNumber': req.body.contactNumber,
			'someMessage': req.body.someMessage
		};
		db.ref().child("data").child(req.params.hostelName).child(req.params.roomNumber).child(req.params.personId).child('swaps').push().set(swapData);
		db.ref().child("contributions").child(req.cookies.currentUser['uid']).child('swaps').push().set(swapData);
		res.redirect('/');
	} else {
		res.redirect('/login?redirect=swap+' + req.params.hostelName + '+' + req.params.roomNumber + '+' + req.params.personId);
	}
});

// search API
app.get('/search', function(req, res) {

	var boysHostels = [];
	var girlsHostels = [];
	// synchronously get data from firebase using promises
	db.ref().child("hostels").child("male").once('value')
	.then( snapshot => {
		snapshot.forEach(function(childSnapshot) {
			var hostelData = childSnapshot.val();
			boysHostels.push(hostelData);
		});
		return boysHostels;
	})
	.then(function(boysHostels) {
		db.ref().child("hostels").child("female").once('value')
		.then( snapshot => {
			snapshot.forEach(function(childSnapshot) {
				var hostelData = childSnapshot.val();
				girlsHostels.push(hostelData);
			});
			return {
				boys: boysHostels,
				girls: girlsHostels
			}
		})
		.then(function(allHostels) {
			res.render('web/public/search.html', {boysHostelsData: allHostels.boys, girlsHostelsData: allHostels.girls});
		})
	});

});

app.post('/search', function(req, res) {
	var roomNumber = req.body.roomNumber;
	var gender = req.body.gender;
	var hostelName = req.body.hostelName;

	db.ref().child("data").child(hostelName).child(roomNumber).once('value')
	.then( snapshot => {
		var roomData = []
		snapshot.forEach(function(childSnapshot) {;
			roomData.push({"key": childSnapshot.key, "value": childSnapshot.val()});
		});
		return roomData;
	})
	.then(function(roomData) {
		let searchQuery = roomNumber + ', ' + hostelName;
		res.render('web/public/data.html', {roomData: JSON.stringify(roomData), searchQuery: searchQuery, searchType: 'search'});
	});
});

// smart search API
app.get('/smartsearch', function(req, res) {
	res.render('web/public/smartsearch.html');
});

app.post('/smartsearch', function(req, res) {
	var smartQuery = req.body.smartQuery;
	
	if (smartQuery.trim() == '') {
		return res.render('web/public/data.html', {roomData: {}, searchQuery: smartQuery, searchType: 'smartsearch'});
	}

	algIndex.search(smartQuery, {
	 "hitsPerPage": 5,
	 "page": 0,
	 "analytics": true,
	 "attributesToRetrieve": "*",
	 "getRankingInfo": true,
	 "responseFields": "*",
	 "facets": []
	},
	function searchDone(err, content) {
		if (err) throw err;
	
		let searchResults = content.hits;

		var allResults = [];

		searchResults.forEach(function(result) {
			var thisResult = {
				"key": result.objectID,
				"value": result
			};
			allResults.push(thisResult);
		});

		let searchQuery = smartQuery;
		res.render('web/public/data.html', {roomData: JSON.stringify(allResults), searchQuery: searchQuery, searchType: 'smartsearch'});
	});

})

// new data entry API
app.get('/newEntry', function(req, res) {
	if (req.cookies.currentUser) {

		var boysHostels = [];
		var girlsHostels = [];

		// synchronously get data from firebase using promises
		db.ref().child("hostels").child("male").once('value')
		.then( snapshot => {
			snapshot.forEach(function(childSnapshot) {
				var hostelData = childSnapshot.val();
				boysHostels.push(hostelData);
			});
			return boysHostels;
		})
		.then(function(boysHostels) {
			db.ref().child("hostels").child("female").once('value')
			.then( snapshot => {
				snapshot.forEach(function(childSnapshot) {
					var hostelData = childSnapshot.val();
					girlsHostels.push(hostelData);
				});
				return {
					boys: boysHostels,
					girls: girlsHostels
				}
			})
			.then(function(allHostels) {
				res.render('web/public/newEntry.html', {boysHostelsData: allHostels.boys, girlsHostelsData: allHostels.girls});
			})
		});

	} else {
		res.send('Unauthorized!');
	}
});

app.post('/newEntry', function(req, res) {
	if (req.cookies.currentUser) {

		var studentName = req.body.studentName;
		var roomNumber = req.body.roomNumber;
		var gender = req.body.gender;
		var hostelName = req.body.hostelName;
		var courseYear = req.body.courseYear;
		var contactNumber = req.body.contactNumber;
		var contactURL = req.body.contactURL;
		var regNo = req.body.regNo;

		if (contactURL.substr(0, 'http://'.length) !== 'http://' && contactURL.substr(0, 'https://'.length) !== 'https://')
		{
		    contactURL = 'http://' + contactURL;
		}
	
		var userData = {
			'studentName': studentName,
			'roomNumber': roomNumber,
			'gender': gender,
			'hostelName': hostelName,
			'courseYear': courseYear,
			'contactNumber': contactNumber,
			'contactURL': contactURL,
			'regNo': regNo,
			'addedBy': req.cookies.currentUser
		};

		var mainRef = db.ref().child("data").child(hostelName).child(roomNumber).push();
		userData['personId'] = mainRef.getKey();
		mainRef.set(userData);

		// record the contribution of the particular user
		db.ref().child("contributions").child(req.cookies.currentUser['uid']).child('newUsers').push().set(userData);
	
		return res.redirect('/logout');
	} else {
		res.send('Unauthorized');
	}
});

// product like API
app.post('/send/love/:tracking', function(req, res) {
	var personWhoLikedMe = req.params.tracking;
	var loveData = {
		'tracker': personWhoLikedMe
	};

	db.ref().child("testimonials").child("loves").push().set(loveData);
});

// server settings
var server = http.createServer(app);

server.listen(4000, function () {
  console.log('Port 4000 - Who Is My Roommate')
});