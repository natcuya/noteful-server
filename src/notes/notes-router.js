const path = require('path')
const express = require('express')
const xss = require('xss')
const NotesService = require('./notes-service')

const notesRouter = express.Router()
const jsonParser = express.json()

const serializeNotes = note => ({
  id: note.id,
  title: xss(note.title),
  modified: note.modified,
  folder_id: note.folder_id,
  content: xss(note.content)
})

notesRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    NotesService.getAllNotes(knexInstance)
      .then(notes => {
        res.json(notes.map(serializeNotes))
      })
      .catch(next)
  })
  .post(jsonParser, (req, res, next) => {
    const { title, content, folder_id } = req.body
    const newNote = { title, content, folder_id}

    for (const [key, value] of Object.entries(newNote))
      if(value == null)
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body`}
        })

    NotesService.insertNote(
      req.app.get('db'),
      newNote
    )
      .then(note => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${note.id}`))
          .json(serializeNotes(note))
      })
      .catch(next)
  })

notesRouter
  .route('/:id')
  .all((req, res, next) => {
    NotesService.getNoteById(
      req.app.get('db'),
      req.params.id
    )
      .then(note => {
        if (!note) {
          return res.status(404).json({
            error: { message: `Note doesn't exist` }
          })
        }
        res.note = note
        next()
      })
      .catch(next)
  })
  .get((req, res, next) => {
    res.json(serializeNotes(res.note))
  })
  .delete((req, res, next) => {
    NotesService.deleteNote(
      req.app.get('db'),
      req.params.id
    )
      .then(() => {
        res.status(204).end()
      })
      .catch(next)
  })
  .patch(jsonParser, (req, res, next) => {
    const { title, content, folder_id } = req.body
    const noteToUpdate = { title, content, folder_id}

    const numOfVal = Object.values(noteToUpdate).filter(Boolean).length
      if(numOfVal === 0 ) {
        return res.status(400).json({
          error: { message: `Request body must contain either 'title', 'content', or 'folder_id'`}
        })
      }

    NotesService.updateNote(
      req.app.get('db'),
      req.params.id,
      noteToUpdate
    )
      .then(() => {
        res.status(204).end()
      })
      .catch(next)
  })
  
module.exports = notesRouter