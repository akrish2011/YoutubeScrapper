var express = require('express');
var router = express.Router();
var yscrapper = require('./yscrapper.js');

/* GET home page. */
router.get('/', function(req, res, next) {
	var url = 'http://www.youtube.com/watch?v=WKsjaOqDXgg';
	// yscrapper.getVideoInformation(url);
	
  res.render('index', { title: 'Express' });
});

var playlistUrl = 'https://www.youtube.com/playlist?list=PLaMGK8uBGSYsDRMPEvuWE8jUCTm0cgsAO';
	yscrapper.scrapInformation(playlistUrl);

module.exports = router;
