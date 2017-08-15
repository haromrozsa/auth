const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//Define our model
const weeklyDataSchema = new Schema({
  key: Number,
  symbol: String,
  date: Date,
  open: Number,
  close: Number,
  high: Number,
  low: Number,
  volume: Number,
  adjClose: Number,
  weekly_change: Number,
  weekly_status: String,
  status: String,
  nextStatus: String,
  action: String,
  nextAction: String,
  full_STO: {
    K: Number,
    D: Number,
  },
  macd: {
    macd: Number,
    signal: Number,
    divergence: Number,
  },
  bb: {
    top: Number,
    middle: Number,
    bottom: Number,
  },
  monthy_data: {
    weekly_start_date: String,
    weekly_end_date: String,
    weekly_open: Number,
    weekly_close: Number,
    weekly_high: Number,
    weekly_low: Number,
    monthly_8_before_date: Date,
    monthly_8_max: Number,
    monthly_8_min: Number,
    monthly_K: Number,
    monthly_3_smoothed_K: Number,
    monthly_before_1_K: Number,
    monthly_before_2_K: Number,
    mondthy_3_smoothed_D: Number,
    monthy_change: Number,
    monthly_status: String
  },
  next_monthy_data: {
    next_monthly_K: Number,
    next_mondthy_3_smoothed_D: Number,
    next_monthly_3_smoothed_K: Number,
    next_monthly_status: String
  }
});


//Create the model class
const ModelClass = mongoose.model('weekly_data', weeklyDataSchema);

//Export the model
module.exports = ModelClass;
