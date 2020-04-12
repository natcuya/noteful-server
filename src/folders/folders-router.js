const path = require('path');
const express = require('express');
const FoldersService = require('./folders-service');

const FoldersRouter = express.Router();
const jsonParser = express.json();

const xss = require('xss');

const serializeFolder = folder => ({
  id: Number(xss(folder.id)),
  title: xss(folder.title),
});

FoldersRouter.route('/folders')
  .get( (req, res, next) => {
    const knexInstance = req.app.get('db');
    FoldersService.getAllFolders(knexInstance)
      .then(folders => {
        res.json(folders.map(serializeFolder));
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const knexInstance = req.app.get('db');
    const {title} = req.body;
    const newFolder = {title};
    for (const [key, value] of Object.entries(newFolder)) {
      if (value === null) {
        return res.status(400).json({
          error: {message: `Missing ${key} in request body.`}
        });
      }
    }
    FoldersService.insertFolder(knexInstance, newFolder)
      .then(folder => {
        res.status(201)
          .location(path.posix.join(req.originalUrl, `/${folder.id}`))
          .json(serializeFolder(folder));
      })
      .catch(next);
  });

FoldersRouter.route('/folders/:folderId')
  .all( (req, res, next) => {
    const knexInstance = req.app.get('db');
    const folderId = req.params.folderId;
    FoldersService.getById(knexInstance, folderId)
      .then(folder => {
        if(!folder){
          return res.status(404).json({
            error: {message: 'Folder does not exist.'}
          });
        }
        res.folder = folder;
        next();
      })
      .catch(next);
  })
  .get( (req, res) => {
    res.json(serializeFolder(res.folder));
  })
  .delete( (req, res, next) => {
    const knexInstance = req.app.get('db');
    const folderId = req.params.folderId;
    FoldersService.deleteById(knexInstance, folderId)
      .then( () => {
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(jsonParser, ( req, res, next ) => {
    const knexInstance = req.app.get('db');
    const {title} = req.body;
    const newFolderData = {title};
    const folderId = req.params.folderId;
    const numberOfValues = Object.values(newFolderData).filter(Boolean).length;
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {message: 'Request body must contain title.'}
      });
    }
    newFolderData.title = title(xss);
    FoldersService.updateById(knexInstance, folderId, newFolderData)
      .then( () => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = FoldersRouter;