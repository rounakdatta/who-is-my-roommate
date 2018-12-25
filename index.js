'use strict';

const http = require('http')
const fs = require('fs');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const request = require('request');

const cookieParser = require('cookie-parser');
const session = require('express-session');

// firebase config
const firebase = require('firebase');

var config = {
    apiKey: "AIzaSyDwr7va2aW5tT_oxRz8UNv-szJAyhubG_g",
    authDomain: "who-is-my-roommate.firebaseapp.com",
    databaseURL: "https://who-is-my-roommate.firebaseio.com",
    projectId: "who-is-my-roommate",
    storageBucket: "who-is-my-roommate.appspot.com",
    messagingSenderId: "258660715420"
  };
var fbapp = firebase.initializeApp(config);
var db = fbapp.database();
var auth = fbapp.auth();

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

	auth.createUserWithEmailAndPassword(email, pwd)
	.then(function(userData) {
		console.log('registering and logging in');
		res.cookie('currentUser', auth.currentUser);
		return res.redirect('/userdashboard');
	})
	.catch(function(error) {
		if (error) {
			console.log(error.message);
			console.log(error);
			return res.redirect('/');
		}
	});
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
			console.log(error.message);
		}
	});
});

// user dashboard
app.get('/userdashboard', function(req, res) {
	if (req.cookies.currentUser) {
		res.render('web/public/dashboard.html');
	} else {
		return res.send('Unauthorized');
	}
});

// user details API
app.get('/details/:hostelName/:roomNumber/:personId', function(req, res) {

	db.ref().child("data").child(req.params.hostelName).child(req.params.roomNumber).once('value')
	.then( snapshot => {
		var roomData = []
		snapshot.forEach(function(childSnapshot) {;
			roomData.push({"key": childSnapshot.key, "value": childSnapshot.val()});
		});
		return roomData;
	})
	.then(function(roomData) {
		res.render('web/public/details.html', {roomData: JSON.stringify(roomData)});
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
			'requesGivenTo': req.params.personId,
			'personName': req.body.personName,
			'bookedRoomNumber': req.body.bookedRoomNumber,
			'gender': req.body.gender,
			'bookedHostelName': req.body.hostelName,
			'contactNumber': req.body.contactNumber,
			'someMessage': req.body.someMessage
		};
		db.ref().child("data").child(req.params.hostelName).child(req.params.roomNumber).child(req.params.personId).child('swaps').push().set(swapData);
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
		res.render('web/public/data.html', {roomData: JSON.stringify(roomData)});
	});
});

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
	
		var userData = {
			'studentName': studentName,
			'roomNumber': roomNumber,
			'gender': gender,
			'hostelName': hostelName,
			'courseYear': courseYear,
			'contactNumber': contactNumber,
			'contactURL': contactURL,
			'regNo': regNo
		};

		db.ref().child("data").child(hostelName).child(roomNumber).push().set(userData);
	
		return res.redirect('/logout');
	} else {
		res.send('Unauthorized');
	}
});

// server settings
var server = http.createServer(app);

server.listen(4000, function () {
  console.log('Port 4000 - Who Is My Roommate')
});