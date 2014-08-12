var express = require("express");

var port = 3701;

var app = express();
app.use(express.static(__dirname + '/build/'));

app.listen(port);