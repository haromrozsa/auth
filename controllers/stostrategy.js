const _ = require('lodash');
const WeeklyData = require('../models/weekly_data');
const d3 = require('d3');
const yahooFinance = require('yahoo-finance');

const STOCHASTICBASE = 6;

getStatus = function(K, D) {
  if (K >= 80) {
    return "LONG";
  } else if (K <= 20) {
    return "SHORT";
  } else {
    if (K >= D) {
      return "LONG";
    } else {
      return "SHORT";
    }
  }
}

exports.getSymbol = function(req, res, next) {

  console.log('Request arrived');

  const symbol = req.body.symbol;
  const from = req.body.from;
  const to = req.body.to;
  const period = req.body.period;

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

    return res.send(quotes);
  });
}

exports.stoStrategy = function(req, res, next) {
    console.log('Start indicator sto' + STOCHASTICBASE );
    const weeklySymbols = req.body.weekly_symbols;
    const monthlySymbols = req.body.monthly_symbols;

    if (!weeklySymbols || !weeklySymbols[0]) {
       return res.status(422).send({error: 'You must provide weekly symbols'});
    }

    if (!monthlySymbols || !monthlySymbols[0]) {
       return res.status(422).send({error: 'You must provide monthly symbols'});
    }

    //delete old data from DB
    WeeklyData.remove({symbol: monthlySymbols[0].symbol}, function(err){
        if(err) return res.status(422).send({error: 'Can not delete historical data'});
    });

    weeklySymbols.pop();

    _.forEach((weeklySymbols), (weeklySymbol, key) => {

        var date = new Date(weeklySymbol.monthyData.openDate);
        date.setHours(4);

        //get monthly data to figure out actual stochastic
        var monthy8BeforeDate = new Date(date);
        monthy8BeforeDate.setMonth(monthy8BeforeDate.getMonth() - (STOCHASTICBASE - 1));

        var monthyCandidates = _.filter(monthlySymbols, (monthlySymbol) => {
          return (new Date(monthlySymbol.date).getTime()  < date.getTime()  && new Date(monthlySymbol.date).getTime() >= monthy8BeforeDate.getTime());
        });

        //TODO: remove next stoc?
        var monthy7BeforeDate = new Date(date);
        monthy7BeforeDate.setMonth(monthy7BeforeDate.getMonth() - (STOCHASTICBASE- 2));

        const nextMonthyCandidates = _.filter(monthlySymbols, (monthlySymbol) => {
          return (new Date(monthlySymbol.date).getTime()  < date.getTime()  && new Date(monthlySymbol.date).getTime() >= monthy7BeforeDate.getTime());
        });

        var stochasctic3BeforeDate = new Date(date);
        stochasctic3BeforeDate.setMonth(stochasctic3BeforeDate.getMonth() - 2);

        var stochasticCandidates = _.filter(monthlySymbols, (monthlySymbol) => {
          return (new Date(monthlySymbol.date).getTime()  < date.getTime()  && new Date(monthlySymbol.date).getTime() >= stochasctic3BeforeDate.getTime());
        });

        const monthlyMaxValue = (_.max(_.map(monthyCandidates, 'high')));
        const monthlyMinValue = (_.min(_.map(monthyCandidates, 'low')));

        const nextMonthlyMaxValue = (_.max(_.map(nextMonthyCandidates, 'high')));
        const nextMonthlyMinValue = (_.min(_.map(nextMonthyCandidates, 'low')));

        const maxValue = weeklySymbol.monthyData.weekly_high;
        const minValue = weeklySymbol.monthyData.weekly_low;
        const openValue = weeklySymbol.monthyData.weekly_open;
        const closeValue = weeklySymbol.monthyData.weekly_close;

        const kminValue = Math.min(minValue, monthlyMinValue);
        const kmaxValue = Math.max(maxValue, monthlyMaxValue);

        const nextKminValue = Math.min(minValue, nextMonthlyMinValue);
        const nextMmaxValue = Math.max(maxValue, nextMonthlyMaxValue);

        //%K = 100(C - L14)/(H14 - L14)
        const K = 100 * (closeValue - kminValue) / (kmaxValue - kminValue);
        const nextK = 100 * (closeValue - nextKminValue) / (nextMmaxValue - nextKminValue);

        const beforeMonth = stochasticCandidates[0];
        //100 * (beforeMonth.close - beforeMonth.low) / (beforeMonth.high - beforeMonth.low);
        const beforemonthK = beforeMonth.fastSTO.K;

        const before2Month = stochasticCandidates[1];
        //100 * (before2Month.close - before2Month.low) / (before2Month.high - before2Month.low);
        const before2monthK = before2Month.fastSTO.K;
        const smoothedK = (K + beforemonthK + before2monthK) / 3;
        const nextSmoothedK = (nextK + K + beforemonthK) / 3;

        const smoothedD = (smoothedK + beforeMonth.fullSTO.K + before2Month.fullSTO.K) / 3;
        const nextSmoothedD = (nextSmoothedK + smoothedK + beforeMonth.fullSTO.K) / 3;
        const weeklyChange = (100*(weeklySymbol.close - weeklySymbol.open)/weeklySymbol.open);
        const monthyChange = (100*(closeValue - openValue)/openValue);

        const weeklyStatus = getStatus(weeklySymbol.fullSTO.K, weeklySymbol.fullSTO.D);
        const monthlyStatus = getStatus(smoothedK, smoothedD);
        const nextMonthlyStatus = getStatus(nextSmoothedK, nextSmoothedD);

        var boilinger;
        if (weeklySymbol.bb) {
            boilinger = {
                top: weeklySymbol.bb.top,
                middle: weeklySymbol.bb.middle,
                bottom: weeklySymbol.bb.bottom,
            }
        }

        //save in DB
        const weeklyData = new WeeklyData({
          key: key,
          symbol: weeklySymbol.symbol,
          date: weeklySymbol.date,
          open: weeklySymbol.open,
          close: weeklySymbol.close,
          high: weeklySymbol.high,
          low: weeklySymbol.low,
          volume: weeklySymbol.volume,
          adjClose: weeklySymbol.adjClose,
          weekly_change: weeklyChange,
          weekly_status: weeklyStatus,
          status: '',
          nextStatus: '',
          action: '',
          full_STO: {
            K: weeklySymbol.fullSTO.K,
            D: weeklySymbol.fullSTO.D,
          },
          macd: {
            macd: weeklySymbol.macd.macd,
            signal: weeklySymbol.macd.signal,
            divergence: weeklySymbol.macd.divergence,
          },
          bb: boilinger,
          monthy_data: {
            weekly_start_date: weeklySymbol.monthyData.openDate,
            weekly_end_date: weeklySymbol.closedate,
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
            monthly_before_2_K: before2monthK,
            monthy_change: monthyChange,
            monthly_status: monthlyStatus
        },
        next_monthy_data: {
          next_monthly_K: nextK,
          next_mondthy_3_smoothed_D: nextSmoothedD,
          next_monthly_3_smoothed_K: nextSmoothedK,
          next_monthly_status: nextMonthlyStatus
        }
      });

      weeklyData.save(function(err) {
        if (err) {
            console.log(err); return next(err);
        } else if (_.size(weeklySymbols) == key + 1) {
            console.log('Finished indicator sto8');
            res.send( { message: 'this is a message' } );
        }
      });
  });
}
