let db = require('./database.js');
let BlockchainModel = require('./models/blockchain');
let StatisticModel = require('./models/statistic');
let CycleModel = require('./models/cycle');
let axios = require('axios');
let Bottleneck = require('bottleneck');
const cycle = require('./models/cycle');


async function updatePrices() {
    // update price data in db (full sync)
    BlockchainModel
        .findOne({}).sort({ date: 'desc' }).exec()
        .then(doc => {
            let updateFromDate = new Date(Date.UTC(2018, 5, 30));
            const updateToDate = new Date(new Date().getTime() - 1000 * 60 * 60 * 24);  // get yesterday
            const promises = [];
            const limiter = new Bottleneck({
                maxConcurrent: 1,
                minTime: 1000
            });
            const days = Math.floor((updateToDate.getTime() - updateFromDate.getTime()) / (1000 * 60 * 60 * 24));
            for (let i = 0; i <= days; i++) {
                const d = new Date(updateFromDate.getTime() + i * 1000 * 60 * 60 * 24);
                const fetchData = async () => {
                    return await axios.get(`https://api.coingecko.com/api/v3/coins/tezos/history?date=${d.getUTCDate()}-${d.getUTCMonth() + 1}-${d.getUTCFullYear()}&localization=false`);
                };
                limiter.schedule(fetchData)
                    .then(function (response) {
                        if (response.data.market_data) {
                            const price = response.data.market_data.current_price.usd;
                            const marketCap = response.data.market_data.market_cap.usd;
                            BlockchainModel
                                .findOneAndUpdate(
                                    {
                                        date: d
                                    },
                                    {
                                        price: price,
                                        marketCap: marketCap
                                    },
                                    {
                                        new: true,
                                        upsert: true
                                    })
                                .then(function (doc) {
                                    console.log(`${d}: ${doc.price}, ${doc.marketCap} updated`);
                                })
                                .catch(function (error) {
                                    console.error(error);
                                });
                        } else {
                            console.error(`no valid data for ${d.toUTCString()}`);
                        }
                    })
            }
        })
        .catch(error => {
            console.error(error);
        });
}

async function updateTotalSupplys() {
    let offset = 0;
    let statistics = []
    while (true) {
        try {
            let url = `https://api.tzkt.io/v1/statistics?offset=${offset}&limit=10000`;
            const response = await axios.get(url);
            console.log(url);
            offset = response.data[response.data.length - 1].level + 1;  // update for next iteration
            for (let i = 0; i < response.data.length; i++) {
                const element = response.data[i];
                statistics.push(element);
            }
            if (response.data.length < 10000) {
                break;
            }
        } catch (error) {
            console.error(error);
        }
    }
    let lastDateNumber = 0;
    let lastTotalSupply = 0;
    let lastDateString = '';
    for (let i = 0; i < statistics.length; i++) {
        const dateNumber = Math.floor(new Date(Date.parse(statistics[i].timestamp)).getTime() / (1000 * 60 * 60 * 24));
        if (dateNumber > lastDateNumber) {
            if (lastDateNumber !== 0) {
                StatisticModel.findOneAndUpdate(
                    {
                        dateString: lastDateString
                    },
                    {
                        dateString: lastDateString,
                        totalSupply: lastTotalSupply
                    },
                    {
                        new: true,
                        upsert: true
                    })
                    .then((doc) => {
                        console.log(`totalSupply on date ${doc.dateString} updated in database`);
                    }).catch((err) => {
                        console.error(err);
                    })
            }
        }
        lastDateNumber = dateNumber;
        lastTotalSupply = statistics[i].totalSupply;
        lastDateString = new Date(Date.parse(statistics[i].timestamp)).toISOString().substring(0, 10);
    }
}

async function updateCycles() {
    let offset = 0;
    let cycles = []
    while (true) {
        try {
            let url = `https://api.tzkt.io/v1/statistics/cyclic?offset=${offset}&limit=10000`;
            const response = await axios.get(url);
            console.log(url);
            offset = response.data[response.data.length - 1].level + 1;  // update for next iteration
            for (let i = 0; i < response.data.length; i++) {
                const element = response.data[i];
                cycles.push(element);
            }
            if (response.data.length < 10000) {
                break;
            }
        } catch (error) {
            console.error(error);
        }
    }
    let cycleObj = {};
    for (let i = 0; i < cycles.length; i++) {
        const date = new Date(Date.parse(cycles[i].timestamp));
        const dateString = date.toISOString().substring(0, 10);
        cycleObj[dateString] = cycles[i].cycle + 1;
    }
    let days = Math.floor((new Date().getTime() - new Date(Date.parse("2018-06-30")).getTime()) / (1000 * 60 * 60 * 24));
    for (let i = 0; i <= days; i++) {
        let date = new Date(Date.parse("2018-06-30") + i * 24 * 60 * 60 * 1000);
        let dateString = date.toISOString().substring(0, 10);
        if (dateString in cycleObj) { 
            // handle with current cycle (latest cycle)
            if (dateString === cycles[cycles.length-1].timestamp.substring(0, 10)) {  // if this is the last cycle in returned data
                while (i <= days) {
                    date = new Date(date.getTime() + 1000 * 60 * 60 * 24);
                    cycleObj[date.toISOString().substring(0, 10)] = cycles[cycles.length-1].cycle + 1;
                    i += 1;
                }
                // break out of the loop
            }
        }
        else {
            const lastDate = new Date(date.getTime() - 1000 * 60 * 60 * 24);
            const lastDateString = lastDate.toISOString().substring(0, 10);
            cycleObj[dateString] = lastDateString in cycleObj? cycleObj[lastDateString]: 0;
        }
    }
    for (let i = 0; i <= days; i++) {
        const date = new Date(Date.parse("2018-06-30") + i * 24 * 60 * 60 * 1000);
        const dateString = date.toISOString().substring(0, 10);
        CycleModel.findOneAndUpdate(
            {
                dateString: dateString
            },
            {
                dateString: dateString,
                cycleNumber: cycleObj[dateString]
            },
            {
                new: true,
                upsert: true
            })
            .then((doc) => {
                console.log(`cycleNumber on date ${doc.dateString} updated in database`);
            }).catch((err) => {
                console.error(err);
            });
    }
}

module.exports = { updatePrices, updateTotalSupplys, updateCycles };