const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeNotesArray } = require('./notes.fixtures');
const { makeFoldersArray } = require('./folders.fixtures');

describe('notes endpoint', function() {
  let db;

  before('make new knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL
    });
    app.set('db', db);
  });

  after('disconnect from database', () => db.destroy() );

  before('clean the table', () => db.raw('TRUNCATE notes, folders RESTART IDENTITY CASCADE'));

  afterEach('clean up after each test', () => db.raw('TRUNCATE notes, folders RESTART IDENTITY CASCADE'));

  describe('GET /notes', () => {
    context('given no notes', () => {
      it('responds 200 and an empty array', () => {
        return supertest(app)
          .get('/notes')
          .expect(200, []);
      });
    });
    context('given notes exist', () => {
      const testFolders = makeFoldersArray();
      const testNotes = makeNotesArray();
      beforeEach('insert folders', () => {
        return db.into('folders').insert(testFolders)
          .then( () => {
            return db.into('notes').insert(testNotes);
          });
      });
      
      it('responds 200 and returns an array of notes', () => {
        return supertest(app)
          .get('/notes')
          .expect(200, testNotes);
      });
    });
    context('given an XSS attack note', () => {
      const testFolders = makeFoldersArray();
      const maliciousNote = {
        title: 'Naughty naughty very naughty <script>alert("xss");</script>',
        id: 1,
        content: 'Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.',
        folder: 1 
      };
      const expectedNote = {
        title: 'Naughty naughty very naughty &lt;script&gt;alert("xss");&lt;/script&gt;',
        id: 1,
        content: 'Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.',
        folder: 1
      };
      beforeEach('insert folders and notes', () => {
        return db.into('folders').insert(testFolders)
          .then( () => {
            return db.into('notes').insert(maliciousNote)
          });
      });
      it('malicious note inserted, return sanitized note', () => {
        return supertest(app)
          .get('/notes')
          .expect(200, [expectedNote]);
      });
    });
  });

  describe('GET /notes/:noteId', () => {
    context('given note with ID does not exist', () => {
      it('responds 404', () => {
        return supertest(app)
          .get('/notes/999')
          .expect(404);
      });
    });
    context('given note ID does exist', () => {
      const testFolders = makeFoldersArray();
      const testNotes = makeNotesArray();
      const expectedId = 1;
      const expectedNote = testNotes[expectedId - 1];
      beforeEach('insert test folders and notes', () => {
        return db.into('folders').insert(testFolders)
          .then( () => {
            return db.into('notes').insert(testNotes);
          });
      });
      it('given note with ID does exist, respond with 200 and correct note', () => {
        return supertest(app)
          .get(`/notes/${expectedId}`)
          .expect(200, expectedNote);
      });
    });
    context('given an XSS attack note', () => {
      const testFolders = makeFoldersArray();
      const maliciousNote = {
        title: 'Naughty naughty very naughty <script>alert("xss");</script>',
        id: 1,
        content: 'Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.',
        folder: 1 
      };
      const expectedNote = {
        title: 'Naughty naughty very naughty &lt;script&gt;alert("xss");&lt;/script&gt;',
        id: 1,
        content: 'Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.',
        folder: 1
      };
      beforeEach('insert folders and notes', () => {
        return db.into('folders').insert(testFolders)
          .then( () => {
            return db.into('notes').insert(maliciousNote);
          });
      });
      it('malicious note inserted, return sanitized note', () => {
        return supertest(app)
          .get('/notes/1')
          .expect(200, expectedNote);
      });
    });

  });

  describe('DELETE /notes/:noteId', () => {
    context('given note with ID does not exist', () => {
      it('responds 404', () => {
        return supertest(app)
          .get('/notes/999')
          .expect(404);
      });
    });
    context('given note ID does exist', () => {
      const testFolders = makeFoldersArray();
      const testNotes = makeNotesArray();
      beforeEach('insert test folders and notes', () => {
        return db.into('folders').insert(testFolders)
          .then( () => {
            return db.into('notes').insert(testNotes);
          });
      });
      it('responds 204, deletes bookmark', () => {
        const idToRemove = 1;
        const expectedNotes = testNotes.filter(note => note.id !== idToRemove);
        return supertest(app)
          .delete(`/notes/${idToRemove}`)
          .expect(204)
          .then( () => {
            return supertest(app)
              .get('/notes')
              .expect(expectedNotes);
          });
      });
    });
  });
});