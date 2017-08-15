const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//Define our model
const securitySchema = new Schema({
  key: Number,
  symbol: String,
  date: Date,
  open: Number,
  close: Number,
  high: Number,
  low: Number,
  volume: Number,
  adjClose: Number,
  closedate: Date,
  monthyData: {
    openDate: Date,
    weekly_open: Number,
    weekly_close: Number,
    weekly_high: Number,
    weekly_low: Number,
    dailyCandidates: [Date],
  }
});

//Export the model
module.exports = securitySchema;
