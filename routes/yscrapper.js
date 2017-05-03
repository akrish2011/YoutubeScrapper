var express = require('express');
var router = express.Router();
var fs = require('fs');
var youtubedl = require('youtube-dl');
var vttToJson = require('vtt-to-json');
var path = require('path');
var videoInfoJson;
var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');
 
// Connection URL 
var mongourl = 'mongodb://db:connectionstring';
// Use connect method to connect to the Server 


module.exports = {

getVideoInformation: function (url){
  
  // Optional arguments passed to youtube-dl.
  var options = ['--username=user', '--password=hunter2'];
  youtubedl.getInfo(url, options, function(err, info) {
  if (err) throw err;

  console.log('id:', info.id);
  console.log('title:', info.title);
  console.log('url:', info.url);
  console.log('thumbnail:', info.thumbnail);
  console.log('description:', info.description);
  console.log('filename:', info._filename);
  console.log('format id:', info.format_id);
	});
},

scrapInformation: function (playlistUrl){
	
	this.getPlaylistVideoInfo(playlistUrl,function(err,data){
		if(err) throw err;

		var writeOutput = data;
		var count = 0;
		//main logic 
		var processData = function (x){
				if(x < data.length){
					console.log("processing videodata");
					var videoData = data[count];
					videoData.videoID = videoData.id;
					delete videoData.id;
					var dirPath = 'C:\\Users\\krish\\projects\\YoutubeScrapper\\subtitle\\';
					var url = 'http://www.youtube.com/watch?v=' + videoData.videoID;
					var options = {
					  // Write automatic subtitle file (youtube only)
					  auto: true,
					  // Downloads all the available subtitles.
					  all: false,
					  // Languages of subtitles to download, separated by commas.
					  lang: 'en',
					  // The directory to save the downloaded files in.
					  cwd: dirPath,
					};

					youtubedl.getSubs(url, options, function(err, files) {
						
						// console.log('subtitle files downloaded:', files, "videoID", );
					  	
					  	if (!err && files.length > 0){
					  		
					  		console.log('processing subtitle file downloaded for', files);
					  		
					  		fs.readFile(dirPath+files,'utf8',function(err,data){
							  	if(!err){
		
							  	var sections = module.exports.convertVttToJson(data);
							  	videoData.transcript = sections;
							  	// videoDataJSON = JSON.stringify(videoData);
							  	MongoClient.connect(mongourl, function(err, db) {
		  							if(err) throw err;
								  	console.log("Connected correctly to MongoDB");
								  	var collection = db.collection('kbdata');
								  	console.log(count);
								  	console.log(JSON.stringify(videoData));
								 //  	collection.insert(videoData, function(err, result) {
									// try{}catch(e){} });

								  	// collection.find({}).toArray(function(err, docs) {
									  //   console.log("Found the following records");
									  //   console.dir(JSON.stringify(docs));
									  //   callback(docs);
									  // });

								  	// count = count+1;
								  	// processData(count);
						  		});

							  }
							});
						}else{
							console.log("No Subtitle Found for Video:",videoData.videoId);
							count = count+1;
							processData(count);
						}
					});	
				}
			};
			processData(count);
	});		
},

getPlaylistVideoInfo: function (url,callback) {

  'use strict';
  var args = ['-j','--flat-playlist'];

  var exec = require('child_process').exec;

  var youtubedlLocation = 'C:\\Users\\krish\\Downloads\\youtube-dl.exe';

  exec(youtubedlLocation+' -j --flat-playlist \"'+url+'\"',function(error, stdout, stderr){
  		if(error) return callback(error,null);

  		var videoInfoJsonArray = [];
  		stdout.split(/\r?\n/).forEach(function (item){
  			try{
  				var jsonItem = JSON.parse(item);
  				delete jsonItem['_type'];
				delete jsonItem['ie_key'];
				delete jsonItem['url'];
  			videoInfoJsonArray.push(jsonItem);	
  			}catch(e){

  			}
  		});
  		
  		return callback(null,videoInfoJsonArray);
  });

},

updateOutputJson: function (inputJson) {
	if(inputJson){
		
		// console.log(JSON.stringify(videoInfoJson));
	}
	console.log(inputJson);
},

getSubTitle: function (videoId) {



},
convertVttToJson: function(vttString) {
  var current = {}
  var sections = []
  var start = false;
  var vttArray = vttString.split('\n');
   vttArray.forEach((line, index) => {
    if (line.replace(/<\/?[^>]+(>|$)/g, "") === " "){
    } else if (line.replace(/<\/?[^>]+(>|$)/g, "") == "") {
    } else if (line.indexOf('-->') !== -1 ) {
      start = true;

      if (current.start) {
        sections.push(module.exports.clone(current))
      }

      current = {
        start: module.exports.timeString2ms(line.split("-->")[0].trimRight().split(" ").pop()),
        end: module.exports.timeString2ms(line.split("-->")[1].trimLeft().split(" ").shift()),
        part: ''
      }
    } else if (line.replace(/<\/?[^>]+(>|$)/g, "") === ""){
    } else if (line.replace(/<\/?[^>]+(>|$)/g, "") === " "){
    } else {
      if (start){
        if (sections.length !== 0) {
          if (sections[sections.length - 1].part.replace(/<\/?[^>]+(>|$)/g, "") === line.replace(/<\/?[^>]+(>|$)/g, "")) {
          } else {
            if (current.part.length === 0) {
              current.part = line
            } else {
              current.part = `${current.part} ${line}`
            }
            // If it's the last line of the subtitles
            if (index === vttArray.length - 1) {
              sections.push(module.exports.clone(current))
            }
          }
        } else {
          current.part = line
          sections.push(module.exports.clone(current))
          current.part = ''
        }
      }
    }
  })

  current = []

  var regex = /(<([0-9:.>]+)>)/ig
  sections.forEach(section => {
    strs = section.part.split()
    var results = strs.map(function(s){
        return s.replace(regex, function(n){
          return n.split('').reduce(function(s,i){ return `==${n.replace("<", "").replace(">", "")}` }, 0)
        })
    });
    cleanText = results[0].replace(/<\/?[^>]+(>|$)/g, "");
    cleanArray = cleanText.split(" ")
    resultsArray = [];
    cleanArray.forEach(function(item){
      if (item.indexOf('==') > -1) {
        var pair = item.split("==")
        var key = pair[0]
        var value = pair[1]
        if(key == "" || key == "##") {
          return;
        }
        resultsArray.push({
          word: module.exports.cleanWord(item.split("==")[0]),
          time: module.exports.timeString2ms(item.split("==")[1]),
        })
      } else {
        resultsArray.push({
          word: module.exports.cleanWord(item),
          time: undefined,
        })
      }
    })
    section.words = resultsArray;
    section.part = section.part.replace(/<\/?[^>]+(>|$)/g, "")

    
  });

  return sections;
},

// helpers
//   http://codereview.stackexchange.com/questions/45335/milliseconds-to-time-string-time-string-to-milliseconds
timeString2ms: function(a,b){// time(HH:MM:SS.mss) // optimized
 return a=a.split('.'), // optimized
  b=a[1]*1||0, // optimized
  a=a[0].split(':'),
  b+(a[2]?a[0]*3600+a[1]*60+a[2]*1:a[1]?a[0]*60+a[1]*1:a[0]*1)*1e3 // optimized
},

// removes everything but characters and apostrophe and dash
cleanWord: function(word) {
  return word.replace(/[^0-9a-z'-]/gi, '').toLowerCase()
},

clone: function(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}


};
