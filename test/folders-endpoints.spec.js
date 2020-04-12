const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeFoldersArray } = require('./folders.fixtures');

describe('folders endpoint', function() {
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

  afterEach('cleanup after each test', () => db.raw('TRUNCATE notes, folders RESTART IDENTITY CASCADE'));

  describe('GET /folders', () => {
    context('given no folders', () => {
      it('responds 200 and an empty array', () => {
        return supertest(app)
          .get('/folders')
          .expect(200, []);
      });
    });
    context('given folders exist', () => {
      const testFolders = makeFoldersArray();
      beforeEach('insert folders', () => {
        return db.into('folders')
          .insert(testFolders);
      });
      it('responds 200 and returns array of folders', () => {
        return supertest(app)
          .get('/folders')
          .expect(200, testFolders);
      });
    });
    context('given an XSS attack folder', () => {
      const maliciousFolder = {
        title: 'Naughty naughty very naughty <script>alert("xss");</script>',
        id: 1,
      };
      const expectedFolder = {
        title: 'Naughty naughty very naughty &lt;script&gt;alert("xss");&lt;/script&gt;',
        id: 1,
      };
      beforeEach('insert folders', () => {
        return db.into('folders')
          .insert(maliciousFolder);
      });
      it('malicious folder inserted, return sanitized folder', () => {
        return supertest(app)
          .get('/folders')
          .expect(200, [expectedFolder]);
      });
    });
  });
  describe('GET /folders/:folderId', () => {
    context('given folderId does not exist', () => {
      it('responds 404', () => {
        return supertest(app)
          .get('/folders/999')
          .expect(404);
      });
    });
    context('given folderId exists', () => {
      const testFolders = makeFoldersArray();
      const expectedId = 2;
      const expectedFolder = testFolders[expectedId - 1];
      beforeEach('insert test folders', () => {
        return db.into('folders').insert(testFolders);
      });
      it('given folderId exists, respond with 200 and correct folder', () => {
        return supertest(app)
          .get(`/folders/${expectedId}`)
          .expect(200, expectedFolder);
      });
    });
    context('given malicious attack folder, sanitize and return', () => {
      const maliciousFolder = {
        title: 'Naughty naughty very naughty <script>alert("xss");</script>',
        id: 1,
      };
      const expectedFolder = {
        title: 'Naughty naughty very naughty &lt;script&gt;alert("xss");&lt;/script&gt;',
        id: 1,
      };
      beforeEach('insert folders', () => {
        return db.into('folders')
          .insert(maliciousFolder);
      });
      it('malicious folder inserted, return sanitized folder', () => {
        return supertest(app)
          .get('/folders/1')
          .expect(200, expectedFolder);
      });

    });
  });
});