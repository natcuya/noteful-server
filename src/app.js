require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const FoldersRouter = require('./folders/folders-router');
const NotesRouter = require('./notes/notes-router');
const app = express();

const morganOption = (process.env.NODE_ENV === 'production')
  ? 'tiny'
  : 'common';

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, world!');
});

app.use(FoldersRouter);
app.use(NotesRouter);

app.use(function errorHandler(error, req, res) {
  let response;
  if (process.env.NODE_ENV === 'production') {
    response = {error: {message: 'server error'} };
  } else {
    console.error(error);
    response= {message:error.message, error};
  }
  res.status(500).json(response);
});

module.exports = app;