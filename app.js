const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const compression = require('compression');
const helmet = require('helmet');

const {updatePrices, updateTotalSupplys, updateCycles} = require('./db_update');

cron.schedule('0 * * * *', () => {
    updatePrices();
    updateTotalSupplys();
    updateCycles();
});

const app = express();
const port = 3000;

app.use(cors());  // enable CORS
app.use(compression());  //Compress all routes
app.use(helmet());

app.use(express.json());

const downloadsRouter = require('./routes/downloads.js');
app.use('/downloads', downloadsRouter);

const apiRouter = require('./routes/api.js');
app.use('/api', apiRouter);

app.listen(port, () => console.log(`Server listening at http://localhost:${port}`));
