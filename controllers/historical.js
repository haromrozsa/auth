const yahooFinance = require('yahoo-finance');
const _ = require('lodash');
const HistoricalsSchema = require('../models/historicals');
const mongoose = require('mongoose');
const async = require("async");

exports.getOrCreateMonthly = function(req, res, next) {

     const symbol = req.body.symbol;
     const MonthlyHistorical = mongoose.model("monthly_historical", HistoricalsSchema);

     MonthlyHistorical.find({ symbol: symbol }).sort({key: -1}).exec(function(err, monthlySymbols) {
         if (err) {
           return res.status(422).send({error: 'Can not read monthly historical data'});
         }

         if (monthlySymbols && monthlySymbols[0]) {
             //result not empty -> return it
             console.log("Monthly Symbol in DB found and returned " + symbol);
             return res.send(monthlySymbols);
         } else {
             console.log("Monthly Symbol not found; retrieve it from yahoo finance " + symbol);
             create(symbol, "m", "2000-01-01", function(err, monthlyQuotes) {
                 if (!monthlyQuotes) {
                    return res.status(422).send({error: 'Error by getting historical data'});
                 }

                 return res.send(monthlyQuotes.reverse());
             });
         }
     });
}

exports.getOrCreateWeekly = function(req, res, next) {

     const symbol = req.body.symbol;
     const WeeklyHistorical = mongoose.model("weekly_historical", HistoricalsSchema);

     WeeklyHistorical.find({ symbol: symbol }).sort({key: 1}).exec(function(err, weeklySymbols) {
         if (err) {
           return res.status(422).send({error: 'Can not read weekly historical data'});
         }

         if (weeklySymbols && weeklySymbols[0]) {
             //result not empty -> return it
             console.log("Weekly Symbol in DB found and returned " + symbol);
             return res.send(weeklySymbols);
         } else {
             console.log("Weekly Symbol not found; retrieve it from yahoo finance " + symbol);



                        console.log('INPUT 1 ' + symbol );
                        console.log('INPUT 2 ' + new Date().toISOString().substring(0, 10) );


                     yahooFinance.historical({
                        symbol: symbol,
                        from: "2001-01-01",
                        to: new Date().toISOString().substring(0, 10),
                        period: "w"
                     }, function (err, quotes) {

                        console.log('Getting weekly historical data finished ' + symbol );
                        console.log('Getting weekly historical data finished ERROR' + err );
                        //remove the last entry not to duplicate last week
                        quotes.reverse();
                        if (symbol.includes('.VI')) {
                            quotes.pop();
                        }
                        console.log("Weekly data " + quotes);
                        callback(err, quotes);
                     });


             async.parallel({
                 weeklyHistoricals: function(callback) {

                        console.log('INPUT 1 ' + symbol );
                        console.log('INPUT 2 ' + new Date().toISOString().substring(0, 10) );


                     yahooFinance.historical({
                        symbol: symbol,
                        from: "2001-01-01",
                        to: new Date().toISOString().substring(0, 10),
                        period: "w"
                     }, function (err, quotes) {

                        console.log('Getting weekly historical data finished ' + symbol );
                        console.log('Getting weekly historical data finished ERROR' + err );
                        //remove the last entry not to duplicate last week
                        quotes.reverse();
                        if (symbol.includes('.VI')) {
                            quotes.pop();
                        }
                        console.log("Weekly data " + quotes);
                        callback(err, quotes);
                     });
                 },
                 dailyHistoricals: function(callback) {
                      create(symbol, "d", "2001-01-01", function(err, dailyQuotes) {
                          console.log('Getting daily historical data finished ' + symbol );
                            console.log("Daily data " + dailyQuotes);
                            console.log("Daily data ERROR" + err);
                          callback(err, dailyQuotes);
                      });
                 }
             }, function(err, results) {

                console.log('TEST Merge daily and weekly historical data started ' + symbol );
                console.log('RESULT ' + results.weeklyHistoricals );

                 if (!results) {
                    return res.status(422).send({error: 'Error by getting weekly historical data'});
                 }
                 if (!results.weeklyHistoricals || results.weeklyHistorical == '') {
                    return res.status(422).send({error: 'Error by getting weekly historical data - weekly list empty!'});
                 }

                console.log('RESULT TEST' );


                 _.forEach((results.weeklyHistoricals), (weeklyHistorical, key) => {

                    console.log(weeklyHistorical.date);


                     if (weeklyHistorical.close > weeklyHistorical.high) {
                        weeklyHistorical.close = weeklyHistorical.close/2;
                     }
                     var lastWorkDayThisWeek = getLastWorkDayThisWeek(weeklyHistorical.date);
                     var monthlyOpenDate = getMonthlyOpenDate(lastWorkDayThisWeek);

                     var dailyCandidates = _.filter(results.dailyHistoricals, (dailyHistorical) => {
                          return (new Date(dailyHistorical.date).getTime()  <= new Date(lastWorkDayThisWeek).getTime()  && new Date(dailyHistorical.date).getTime() >= new Date(monthlyOpenDate).getTime());
                     });

                     if (!dailyCandidates || !dailyCandidates[0]) {
                          //if last workday national holiday -> set last work day to the day before and recount values
                          lastWorkDayThisWeek.setDate(lastWorkDayThisWeek.getDate()-1);
                          monthlyOpenDate = getMonthlyOpenDate(lastWorkDayThisWeek);
                          dailyCandidates = _.filter(results.dailyHistoricals, (dailyHistorical) => {
                                return (new Date(dailyHistorical.date).getTime()  <= new Date(lastWorkDayThisWeek).getTime()  && new Date(dailyHistorical.date).getTime() >= new Date(monthlyOpenDate).getTime());
                          });
                     }

                     const maxValue = (_.max(_.map(dailyCandidates, 'high')));
                     const minValue = (_.min(_.map(dailyCandidates, 'low')));
                     const sortedCanidates = _.sortBy(dailyCandidates, ['date']);
                     const openValue = (_.first(sortedCanidates))['open'];
                     const closeValue = (_.last(sortedCanidates))['close'];

                     weeklyHistorical.key = key;
                     weeklyHistorical.closedate = lastWorkDayThisWeek;
                     weeklyHistorical.monthyData = {};
                     weeklyHistorical.monthyData.openDate = monthlyOpenDate;
                     weeklyHistorical.monthyData.dailyCandidates = _.map(dailyCandidates, 'date');

                     weeklyHistorical.monthyData.weekly_open = openValue;
                     weeklyHistorical.monthyData.weekly_close = closeValue;
                     weeklyHistorical.monthyData.weekly_high = maxValue;
                     weeklyHistorical.monthyData.weekly_low = minValue;

                     const security = new WeeklyHistorical( weeklyHistorical );

                      console.log("2 " + weeklyHistorical.date);


                     security.save(function(err) {
                         if (err) {
                             console.log(err);
                             return res.send({ message: 'Unexpected error while saved in DB ' + err });
                         } else if (_.size(results.weeklyHistoricals) == key + 1) {
                             //return res.send({ message: symbol + ' successfully generated in DB (size): ' + _.size(results.weeklyHistoricals) });
                             return res.send( results.weeklyHistoricals );
                         }
                         console.log("SAVED " + weeklyHistorical.date);

                     });
                 });
             });
         }
     });
}

create = function(symbol, period, from, callback) {

   const to =  new Date().toISOString().substring(0, 10);

   var schemaName = "daily_historical";
   if (period == 'w') {
        schemaName = "weekly_historical";
   } else if (period == 'm') {
        schemaName = "monthly_historical";
   }

   const Historical = mongoose.model(schemaName, HistoricalsSchema);

   Historical.remove({symbol: symbol}, function(err){
        if(err) return res.status(422).send({error: 'Can not delete historical data'});
   });

   yahooFinance.historical({
       symbol: symbol,
       from: from,
       to: to,
       period: period
   }, function (err, quotes) {

       if (err) {
           console.log("Unexpected error: " + err);
           callback('Unexpected error while load from yahoo finance ' + err);
       }

       if (period === 'd') {
            callback(undefined, quotes);
       } else {
            //remove the last entry not to duplicate last week
            if (symbol.includes('.VI')) {
                quotes.shift();
            }

           _.forEach((quotes), (quote, key) => {

                 if (quote.close > quote.high) {
                    quote.close = quote.close/2;
                 }

                const security = new Historical({
                    key: key,
                    symbol: quote.symbol,
                    date: quote.date,
                    open: quote.open,
                    close: quote.close,
                    high: quote.high,
                    low: quote.low,
                    volume: quote.volume,
                    adjClose: quote.adjClose
                });

                security.save(function(err) {
                    if (err) {
                        console.log(err);
                        callback('Unexpected error while saved in DB ' + err);
                    } else if (_.size(quotes) == key + 1) {
                        callback(undefined, quotes);
                    }
                });
           });
       }
   });
}

getLastWorkDayThisWeek = function(date) {
    var date = new Date(date);
    if (date.getDay() === 1) {
        return new Date(date.setDate(date.getDate() + 4));
    } else if (date.getDay() === 2) {
        return new Date(date.setDate(date.getDate() + 3));
    } else if (date.getDay() === 3) {
        return new Date(date.setDate(date.getDate() + 2));
    } else if (date.getDay() === 4) {
        return new Date(date.setDate(date.getDate() + 1));
    } else if (date.getDay() === 0) {
        //Fix: If yahoo returns "Sunday", it should be take as the next "Monday"
        return new Date(date.setDate(date.getDate() + 5));
    }
}

getMonthlyOpenDate = function(date) {
    var date = new Date(date);
    return new Date(date.setDate('01'));
}
