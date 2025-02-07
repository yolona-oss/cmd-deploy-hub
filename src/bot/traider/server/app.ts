import express from 'express';
import httpStatus from 'http-status';
import cors from 'cors';

import routes from './routes';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.options('*', cors());

app.use('/v1', routes);

const errorHandler = (err: any, _: any, res: any, __: any) => {
    let { statusCode, message } = err;
    res.locals.errorMessage = err.message;

    const response = {
        code: statusCode,
        message,
        stack: err.stack,
    };

    console.error(err)

    res.status(statusCode).send(response);
};

app.use(errorHandler);

export { app as Application }
