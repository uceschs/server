// express is the server that forms part of the nodejs program
var express = require('express');
var path = require("path");
var app = express();
var fs = require('fs');

// convert the configuration file into the correct format -i.e. name/value pair array
var configtext = "" + fs.readFileSync("/home/studentuser/certs/postGISConnection.js");
var configarray = configtext.split(",");
var config = {};

// for (statement1, statement2, statement3)
// statement1: executed before the loop starts
// statement2: defined the condition for running the loop
// statement3: executed each time after the loop has been executed
for (var i = 0; i < configarray.length; i++){
	var split = configarray[i].split(':');
	config[split[0].trim()] = split[1].trim();
}

// adding functionality to allow cross-domain queries when PhoneGap is running a server
app.use(function(req, res, next) {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Headers", "X-Requested-With");
	res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
	next();
});

	
// adding functionality to log the requests
app.use(function (req, res, next) {
	var filename = path.basename(req.url);
	var extension = path.extname(filename);
	console.log("The file " + filename + " was requested.");
	next();
});
	

// add an http server to serve files to the Edge browser 
// due to certificate issues it rejects the https files if they are not
// directly called in a typed URL
var http = require('http');
var httpServer = http.createServer(app); 
httpServer.listen(4480);

app.get('/',function (req,res) {
	res.send("hello world from the HTTP server");
});

// import the required connectivity code and set up a database connection
var pg = require('pg');
var pool = new pg.Pool(config);


// to be able to process the uploaded data
// body-parser extracts the entire body portion of an incoming request stream and exposes it on req.body
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
	extended:true
	}));
app.use(bodyParser.json());


app.post('/uploadData', function(req,res) {
  // note that we are using POST here as we are uploading data
  // so the parameters form part of the BODY of the request rather than the RESTful API
  console.dir(req.body);

  pool.connect(function(err,client,done) {
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        } 
        var geometrystring = "st_geomfromtext('POINT(" + req.body.longitude + " " + req.body.latitude + ")', 4326";
        var querystring = "INSERT into app_questions(question,answer1,answer2,answer3,answer4,answer_true,geom) values ('";
        querystring = querystring + req.body.question+"','";
        querystring = querystring + req.body.answer1 + "','" + req.body.answer2 + "','" + req.body.answer3+"','" + req.body.answer4+"','"+req.body.answer_true+"',"+geometrystring +"));";
        console.log(querystring);
        client.query(querystring,function(err,result) {
          done(); 
          if(err){
               console.log(err);
               res.status(400).send(err);
          }
          res.status(200).send("row inserted");
       });
    });
});


app.post('/uploadQizData', function(req,res) {
  // note that we are using POST here as we are uploading data
  // so the parameters form part of the BODY of the request rather than the RESTful API
  console.dir(req.body);

  pool.connect(function(err,client,done) {
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        } 
        var querystring = "INSERT into app_user(name,surname,module,question,answer) values ('";
        querystring = querystring + req.body.name+"','";
        querystring = querystring + req.body.surname + "','" + req.body.module + "','" + req.body.question+"','" + req.body.answer+"','";
        console.log(querystring);
        client.query(querystring,function(err,result) {
          done(); 
          if(err){
               console.log(err);
               res.status(400).send(err);
          }
          res.status(200).send("row inserted");
       });
    });
});



app.get('/getPOI', function (req,res) {
     pool.connect(function(err,client,done) {
       if(err){
           console.log("not able to get connection "+ err);
           res.status(400).send(err);
       }
        // use the inbuilt geoJSON functionality
        // and create the required geoJSON format using a query adapted from here:http://www.postgresonline.com/journal/archives/267-Creating-GeoJSON-Feature-Collections-with-JSON-and-PostGIS-functions.html, accessed 4th January 2018
        // note that query needs to be a single string with no line breaks so builtit up bit by bit
             var querystring = " SELECT 'FeatureCollection' As type,array_to_json(array_agg(f)) As features  FROM ";
             querystring = querystring + "(SELECT 'Feature' As type,ST_AsGeoJSON(lg.geom)::json As geometry, ";
             querystring = querystring + "row_to_json((SELECT l FROM (SELECT question, answer1, answer2, answer3, answer4, answer_true) As l)) As properties";
             querystring = querystring + "   FROM app_questions  As lg limit 100) As f ";
             console.log(querystring);
             client.query(querystring,function(err,result){
             //call `done()` to release the client back to the pool
             done();
             if(err){
             	console.log(err);
             	res.status(400).send(err);
             }
             res.status(200).send(result.rows);
         });
     }); 
 });


 app.get('/postgistest', function(req,res){
    pool.connect(function(err,client,done){
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        }
        client.query('select name from united_kingdom_counties',function(err,result)
        {
        done();
        if(err){
            console.log(err);
            res.status(400).send(err);
        }
        res.status(200).send(result.rows);
        });
    });
});



 	// the / indicates the path that you type into the server - in this case, what happens when you type in:  http://developer.cege.ucl.ac.uk:32560/xxxxx/xxxxx
  app.get('/:name1', function (req, res) {
  // run some server-side code
  // the console is the command line of your server - you will see the console.log values in the terminal window
  console.log('request '+req.params.name1);

  // the res is the response that the server sends back to the browser - you will see this text in your browser window
  res.sendFile(__dirname + '/'+req.params.name1);
});


  // the / indicates the path that you type into the server - in this case, what happens when you type in:  http://developer.cege.ucl.ac.uk:32560/xxxxx/xxxxx
  app.get('/:name1/:name2', function (req, res) {
  // run some server-side code
  // the console is the command line of your server - you will see the console.log values in the terminal window
  console.log('request '+req.params.name1+"/"+req.params.name2);

  // the res is the response that the server sends back to the browser - you will see this text in your browser window
  res.sendFile(__dirname + '/'+req.params.name1+'/'+req.params.name2);
});


	// the / indicates the path that you type into the server - in this case, what happens when you type in:  http://developer.cege.ucl.ac.uk:32560/xxxxx/xxxxx/xxxx
	app.get('/:name1/:name2/:name3', function (req, res) {
		// run some server-side code
		// the console is the command line of your server - you will see the console.log values in the terminal window
		console.log('request '+req.params.name1+"/"+req.params.name2+"/"+req.params.name3); 
		// send the response
		res.sendFile(__dirname + '/'+req.params.name1+'/'+req.params.name2+ '/'+req.params.name3);
	});
  // the / indicates the path that you type into the server - in this case, what happens when you type in:  http://developer.cege.ucl.ac.uk:32560/xxxxx/xxxxx/xxxx
  app.get('/:name1/:name2/:name3/:name4', function (req, res) {
  // run some server-side code
  // the console is the command line of your server - you will see the console.log values in the terminal window
 console.log('request '+req.params.name1+"/"+req.params.name2+"/"+req.params.name3+"/"+req.params.name4); 
  // send the response
  res.sendFile(__dirname + '/'+req.params.name1+'/'+req.params.name2+ '/'+req.params.name3+"/"+req.params.name4);
});