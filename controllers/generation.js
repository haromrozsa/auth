const _ = require('lodash');
const WeeklyData = require('../models/weekly_data');
const d3 = require('d3');
const yahooFinance = require('yahoo-finance');

exports.get = function(req, res, next) {

  console.log('Request arrived');

  const symbol = req.body.symbol;
  const from = req.body.from;
  const to = req.body.to;
  const period = req.body.period;

  console.log(symbol);
  console.log(from);
  console.log(to);
  console.log(period);

  if (!symbol || !from || !to || !period) {
    return res.status(422).send({error: 'You must provide symbol, dates and period'});
  }

  yahooFinance.historical({
    symbol: symbol,
    from: from,
    to: to,
    period: period
  }, function (err, quotes) {

    if (err) {
      return res.status(422).send({error: 'Error by getting historical data'});
    }

    //console.log(quotes);
    return res.send(quotes);
  });
}

exports.save = function(req, res, next) {
  const weeklySymbols = req.body.weekly_symbols;
  const monthlySymbols = req.body.monthly_symbols;

  monthlySymbols.pop();
  weeklySymbols.pop();
  /*console.log('osszes');
  console.log((monthlySymbols));
  console.log('utolso');
  console.log(_.last(monthlySymbols));
  console.log('elso');
  console.log(_.head(monthlySymbols));*/

  if (!weeklySymbols || !weeklySymbols[0]) {
    return res.status(422).send({error: 'You must provide weekly symbols'});
  }

  if (!monthlySymbols || !monthlySymbols[0]) {
    return res.status(422).send({error: 'You must provide monthly symbols'});
  }

  //console.log(monthlySymbols);
  /*weeklySymbols.forEach(function(weeklySymbol) {
    console.log(weeklySymbols);
  });*/
console.log('Save indul');
const formatTime = d3.timeFormat("%Y-%m-%d");
//console.log(formatTime(new Date));

  _.forEach((weeklySymbols), (weeklySymbol) => { //_.tail
    //console.log(weeklySymbol);

    var date = new Date(weeklySymbol.date);
    date.setDate(date.getDate() + 4);
    date.setHours(4);

    const endDateAsString = formatTime(new Date(date));
    const startDateAsString = formatTime(date.setDate('01'));

    var monthy8BeforeDate = new Date(date);
    monthy8BeforeDate.setMonth(monthy8BeforeDate.getMonth() - 7);

    const monthyCandidates = _.filter(monthlySymbols, (monthlySymbol) => {
      //console.log(new Date(monthlySymbol.date));
      //console.log((date));
      //console.log((monthy8BeforeDate));
      //console.log(new Date(monthlySymbol.date).getTime()  < date.getTime());
      //console.log(new Date(monthlySymbol.date).getTime()  >= monthy8BeforeDate.getTime());
      //console.log(new Date(monthlySymbol.date).getTime()  < date.getTime()  && new Date(monthlySymbol.date).getTime() >= monthy8BeforeDate.getTime());
      return (new Date(monthlySymbol.date).getTime()  < date.getTime()  && new Date(monthlySymbol.date).getTime() >= monthy8BeforeDate.getTime());
    });

    if (_.size(monthyCandidates) !== 7) {
      console.log(date);
      console.log(monthy8BeforeDate);
      console.log(_.size(monthyCandidates));
      console.log(monthyCandidates);
    }

    var stochasctic3BeforeDate = new Date(date);
    stochasctic3BeforeDate.setMonth(stochasctic3BeforeDate.getMonth() - 2);

    //console.log(date);
    //console.log(stochasctic3BeforeDate);

    const stochasticCandidates = _.filter(monthlySymbols, (monthlySymbol) => {
      return (new Date(monthlySymbol.date).getTime()  < date.getTime()  && new Date(monthlySymbol.date).getTime() >= stochasctic3BeforeDate.getTime());
    });

    if (_.size(stochasticCandidates) !== 2) {
      console.log(date);
      console.log(stochasctic3BeforeDate);
      console.log(_.size(stochasticCandidates));
      console.log(stochasticCandidates);
    }

    const monthlyMaxValue = (_.max(_.map(monthyCandidates, 'high')));
    const monthlyMinValue = (_.min(_.map(monthyCandidates, 'low')));

    yahooFinance.historical({
      symbol: weeklySymbol.symbol,
      from: startDateAsString,
      to: endDateAsString,
       period: 'd'  // 'd' (daily), 'w' (weekly), 'm' (monthly), 'v' (dividends only)
    }, function (err, quotes) {

      if (_.max(_.map(quotes, 'high')) === undefined) {
        console.log((_.map(quotes, 'high')));
        console.log(startDateAsString);
        console.log(endDateAsString);
      }

    //  console.log(_.first(quotes));

      const maxValue = (_.max(_.map(quotes, 'high')));
      const minValue = (_.min(_.map(quotes, 'low')));
      const openValue = (_.first(quotes))['open'];
      const closeValue = (_.last(quotes))['close'];

      const kminValue = Math.min(minValue, monthlyMinValue);
      const kmaxValue = Math.max(maxValue, monthlyMaxValue);

      const K = 100 * (closeValue - kminValue) / (kmaxValue - kminValue);
      //TODO

      const beforeMonth = stochasticCandidates[0];
      //console.log(beforeMonth);
      const beforemonthK = beforeMonth.fastSTO.K;//100 * (beforeMonth.close - beforeMonth.low) / (beforeMonth.high - beforeMonth.low);
      //console.log(beforemonthK.monthy_data.K);

      const before2Month = stochasticCandidates[1];
      const before2monthK = before2Month.fastSTO.K;//100 * (before2Month.close - before2Month.low) / (before2Month.high - before2Month.low);
      const smoothedK = (K + beforemonthK + before2monthK) / 3;

      const smoothedD = (smoothedK + beforeMonth.fullSTO.K + before2Month.fullSTO.K) / 3;
      //%K = 100(C - L14)/(H14 - L14)

      const weeklyData = new WeeklyData({
        symbol: weeklySymbol.symbol,
        date: weeklySymbol.date,
        open: weeklySymbol.open,
        close: weeklySymbol.close,
        high: weeklySymbol.high,
        low: weeklySymbol.low,
        volume: weeklySymbol.volume,
        adjClose: weeklySymbol.adjClose,
        monthy_data: {
          //date: weeklySymbol.monthyData.date,
          weekly_start_date: startDateAsString,
          weekly_end_date: endDateAsString,
          weekly_open: openValue,
          weekly_close: closeValue,
          weekly_high: maxValue,
          weekly_low: minValue,
          monthly_8_before_date: monthy8BeforeDate,
          monthly_8_max: monthlyMaxValue,
          monthly_8_min: monthlyMinValue,
          monthly_K: K,
          mondthy_3_smoothed_D: smoothedD,
          monthly_3_smoothed_K: smoothedK,
          monthly_before_1_K: beforemonthK,
          monthly_before_2_K: before2monthK

          //open: weeklySymbol.monthyData.open
        }
      });

      //console.log(weeklyData);

      weeklyData.save(function(err) {
        if (err) { console.log(err); return next(err); }

        //console.log('saved');
      });

    });

    //console.log(formatTime(date));
  });
console.log('Save vege');
  res.send( { message: 'this is a message' });

}
