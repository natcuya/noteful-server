const path = require('path');
const express = require('express');
const NotesService = require('./notes-service.js');

const NotesRouter = express.Router();
const jsonParser = express.json();

const xss = require('xss');

const serializeNote = note => ({
  id: Number(xss(note.id)),
  title: xss(note.title),
  content: xss(note.content),
  folder: note.folder,
  modified: new Date()
});

NotesRouter.route('/notes')
  .get( (req, res) => {
    const knexInstance = req.app.get('db');
    NotesService.getAllNotes(knexInstance)
      .then(notes => {
        res.json(notes.map(serializeNote));
      });
  })
  .post(jsonParser, (req, res, next) => {
    const knexInstance = req.app.get('db');
    const {title, content, folder, modified, date_created} = req.body;
    const newNote = {title, content, folder, modified, date_created};
    for (const [key, value] of Object.entries(newNote)) {
      if (value === null) {
        return res.status(400).json({
          error: {message: `Missing ${key} in request body.`}
        });
      }
    }
    NotesService.insertNote(knexInstance, newNote)
      .then(note => {
        res.status(201)
          .location(path.posix.join(req.originalUrl, `/${note.id}`))
          .json(serializeNote);
      })
      .catch(next);
  });

NotesRouter.route('/notes/:noteId')
  .all( (req, res, next) => {
    const knexInstance = req.app.get('db');
    const noteId = req.params.noteId;
    NotesService.getById(knexInstance, noteId)
      .then(note => {
        if(!note) {
          return res.status(404).json({
            error: {message: 'Note does not exist.'}
          });
        }
        res.note = note;
        next();
      })
      .catch(next);
  })
  .get( (req, res ) => {
    res.json(serializeNote(res.note));
  })
  .delete( (req, res, next) => {
    const knexInstance = req.app.get('db');
    const noteId = req.params.noteId;
    NotesService.deleteById(knexInstance, noteId)
      .then( () => {
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(jsonParser, ( req, res, next ) => {
    const knexInstance = req.app.get('db');
    const {title, content, folder } = req.body;
    const newNoteData = {title, content, folder};
    const noteId = req.params.noteId;
    const numberOfValues = Object.values(newNoteData).filter(Boolean).length;
    if (numberOfValues === 0) {
      res.status(400).json({
        error: {message: 'Request body must contain title, content, or folderID.'}
      });
    }
    if (title) {
      newNoteData.title = xss(title);
    }
    if (content) {
      newNoteData.content = xss(content);
    }

    NotesService.updateById(knexInstance, noteId, newNoteData)
      .then( () => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = NotesRouter;