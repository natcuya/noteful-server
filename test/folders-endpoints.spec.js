const knex = require('knex')
const app = require('../src/app')
const { makeFoldersArray, makeMaliciousFolder } = require('./folders.fixtures')

describe('Folders Endpoints', function() {
  let db
  
  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('clean the table', () => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'))

  afterEach('cleanup', () => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'))

  describe(`GET /api/folder`, () => {
    context(`Given no folders`, () => {
      it (`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, [])
      })
    })
    
    context('Given there are folders in the database', () => {
      const testFolders = makeFoldersArray();
      
      beforeEach('insert folder', () => {
        return db
          .into('folders')
          .insert(testFolders)
      })
      
      it('responds with 200 and all of the folders', () => {
        return supertest(app)
        .get('/api/folders')
        .expect(200, testFolders)
      })
    })

    context('Given malicious XSS content', () => {
      const { maliciousFolder, expectedFolder } = makeMaliciousFolder()

      beforeEach('insert malicious folder', () => {
        return db
          .into('folders')
          .insert(maliciousFolder)
      })

      it('removes malicious content', () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200)
          .expect(r => {
            expect(r.body[0].folder_name).to.eql(expectedFolder.folder_name)
          })
      })
    })
  })

  describe('GET /api/folders/:id', () => {
    context(`Given no folders`, () => {
      it('responds with 404', () => {
        const folderId = 123456
        return supertest(app)
          .get(`/api/folders/${folderId}`)
          .expect(404, { error: { message: `Folder doesn't exist` } })
      })
    })

    context('Given there are folders in the DB', () => {
      const testFolders = makeFoldersArray()

      beforeEach('insert folders', () => {
        return db
          .into('folders')
          .insert(testFolders)
      })

      it('responds with 200 and the specified folder', () => {
        const id = 2
        const expectedFolder = testFolders[id - 1]
        return supertest(app)
          .get(`/api/folders/${id}`)
          .expect(200, expectedFolder)
      })
    })

    context('Given XSS content', () => {
      const {maliciousFolder, expectedFolder} = makeMaliciousFolder()

      beforeEach('Insert malicious folder', () => {
        return db
          .into('folders')
          .insert(maliciousFolder)
      })
      
      it('Removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/folders/${maliciousFolder.id}`)
          .expect(200)
          .expect(r => {
            expect(r.body.folder_name).to.eql(expectedFolder.folder_name)
          })
      })
    })
  })

  describe('POST /api/folders', () => {
    context('Given a valid folder', () => {
      const newFolder = {
        folder_name: 'New Folder'
      }

      it(`responds with 201 adds the folder to the DB`, () => {
        return supertest(app)
          .post('/api/folders')
          .send(newFolder)
          .expect(201)
          .expect(res => {
            expect(res.body.folder_name).to.eql(newFolder.folder_name)
            expect(res.body).to.have.property('id')
            expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`)
          })
          .then(res => 
            supertest(app)
              .get(`/api/folders/${res.body.id}`)
              .expect(res.body)
          )
      })
    })
    context('Given an invalid folder', () => {
      const invalidFolder = {}

      it('responds with 400 and an error message when folder_name is missing', () => {
        return supertest(app)
          .post(`/api/folders`)
          .send(invalidFolder)
          .expect(400, {
            error : { message: `Missing folder_name in request body`}
          })
      })
    })

    context('Given malicious XSS content', () => {
      const {maliciousFolder, expectedFolder} = makeMaliciousFolder()
      it('removes XSS content', () => {
        return supertest(app)
          .post(`/api/folders`)
          .send(maliciousFolder)
          .expect(201)
          .expect(res => {
            expect(res.body.folder_name).to.eql(expectedFolder.folder_name)
          })
      })
    })  
  })

  describe(`DELETE /api/folders/:id`, () => {
    context(`Given no folders`, () => {
      it(`rsponds with 404`, () => {
        const id = 123456
        return supertest(app)
          .delete(`/api/folders/${id}`)
          .expect(404, { error: { message: `Folder doesn't exist`}})
      })
    })

    context(`Given that are folders in the DB`, () => {
      const testFolders = makeFoldersArray()

      beforeEach(`insert folders`, () => {
        return db
          .into('folders')
          .insert(testFolders)
      })

      it('reponds with 204 and removes the folder', () => {
        const id = 2 
        const expected = testFolders.filter(folder => folder.id !== id)
        return supertest(app)
          .delete(`/api/folders/${id}`)
          .expect(204)
          .then(res => 
            supertest(app)
              .get(`/api/folders`)
              .expect(expected)
          )
      })
    })
  })

  describe(`PATCH /api/folder/:id`, () => {
    context('Given no folders', () => {
      it('responds with 404', () => {
        const id = 123456
        return supertest(app)
          .patch(`/api/folders/${id}`)
          .expect(404, { error: { message: `Folder doesn't exist` } })
      })
    })

    context('Given there are folders in the DB', () => {
      const testFolders =  makeFoldersArray()

      beforeEach('insert folders', () => {
        return db
          .into('folders')
          .insert(testFolders)
      })

      it('responds with 204 and updates the folder', () => {
        const id = 2
        const updateFolder = {
          folder_name: 'updated folder name'
        }
        const expectedFolder = {
          ...testFolders[id - 1],
          ...updateFolder
        }
        return supertest(app)
          .patch(`/api/folders/${id}`)
          .send(updateFolder)
          .expect(204)
          .then(() => 
            supertest(app)
              .get(`/api/folders/${id}`)
              .expect(expectedFolder)
          )
      })

      it('responds with 400 when folder_name is missing', () => {
        const id = 2
        const invalidFolder = {}

        return supertest(app)
          .patch(`/api/folders/${id}`)
          .send(invalidFolder)
          .expect(400, {
            error: {message: `Request body must contain 'folder_name'`}
          })
      })
    })
  })
})