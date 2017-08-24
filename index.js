const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const app = express();
const router = require('./router');
const mongoose = require('mongoose');
const cors = require('cors');

//DB Setup
//mongoose.connect('mongodb://localhost:auth/auth');
mongoose.connect('mongodb://heroku_jcf22zkt:heroku_jcf22zkt@ds017173.mlab.com:17173/heroku_jcf22zkt');

//App shouldComponentUpdate
app.use(morgan('combined'));
app.use(cors());
app.use(bodyParser.json({ tpye: '*.*', limit: '10mb'}));
router(app);

//Server Setup
const port = process.env.PORT || 3090;
const server = http.createServer(app);
server.listen(port);
console.log("Server listening on: 3090");
