//framework
const express = require('express');
//cross origin
const cors = require('cors');
//time interval package
const cron = require('node-cron');
//middleware compressor
const compression = require('compression');
//secondary heading on http reqs 
const helmet = require('helmet');

//database update objects 
const { updatePrices, updateTotalSupplys, updateCycles } = require('./db_update');

//execute code by min,hour,day,month,year
cron.schedule('0 * * * *', () => {
    //system objects being called by the cron meta
    updatePrices();
    updateTotalSupplys();
    updateCycles();
});

//above is database working
//below is request routing and analysis framework

//initizalize the express framework
const app = express();
//machine port
const port = 3000;

//configure the framework
app.use(cors());  // enable CORS
app.use(compression());  //Compress all routes
app.use(helmet());
app.use(express.json());

//framework system synonyms

//get exports from downloads file
const downloadsRouter = require('./routes/downloads.js');
//configure framework to use downloads route. The route is attached with its own const object above
app.use('/downloads', downloadsRouter);

//get the module exports. which is its framework
const apiRouter = require('./routes/api.js');
//configure the system's framework to integrate the module's framework
app.use('/api', apiRouter);

//connects the framework to a port 
const server = app.listen(port, () => console.log(`Server listening at http://localhost:${port}`));

//cors header
const options = { origins: '*:*' };
//get socket framework, passes the frameworks server endpoint to it
const io = require('socket.io')(server, options);

//shortcut that retrieves one export of the module. instead of module path.export
const {analysis} = require('./sio/analysis');

//turns on the socket endpoint, names it socket
io.on('connection', (socket) => {
    //when a request inserts into the socket, pass the request's data to 
    socket.on('analysisReq', data => {
        //the analysis module. 
        analysis(socket, data.address, data.start, data.end);
    });
});