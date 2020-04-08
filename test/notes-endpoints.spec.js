const knex = require('knex')
const app = require('../src/app')
const { makeNotesArray, makeMaliciousNote } = require('./notes.fixtures')
const { makeFoldersArray } = require('./folders.fixtures')

describe.only('Notes Endpoints', function() {
  let db 

  function insertData(folders, notes) {
    return db
      .into('folders')
      .insert(folders)
      .then(() => {
        return db
          .into('notes')
          .insert(notes)
      })
  }
  
  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL
    })
    app.set('db', db)
  })
  
  after('disconnect from db', () => db.destroy())
  
  before('clean the table', () => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'))
  
  afterEach('cleanup', () => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'))

  describe(`GET /api/notes`, () => {
    context(`Given no notes`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
        .get('/api/notes')
        .expect(200, [])
      })
    })

    context('Given there are notes in the database', () => {
      const testFolders = makeFoldersArray()
      const testNotes = makeNotesArray()

      beforeEach('insert notes', () => insertData(testFolders, testNotes))
      // () => {
      //   return db 
      //     .into('folders')
      //     .insert(testFolders)
      //     .then(() => {
      //       return db 
      //         .into('notes')
      //         .insert(testNotes)
      //     })
      // })

      it('responds with 200 and all of the notes', () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, testNotes)
      })
    }) 

    context(`Given an XSS attack note`, () => {
      const testFolders = makeFoldersArray()
      const { maliciousNote, expectedNote } = makeMaliciousNote()

      beforeEach('insert malicious note', () => {
        return db
          .into('folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('notes')
              .insert(maliciousNote)
          })
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/notes`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].title).to.eql(expectedNote.title)
            expect(res.body[0].content).to.eql(expectedNote.content)
          })
      })
    })
  })

  describe(`GET /api/notes/:id`, () => {
    context(`Given no notes`, () => {
      it('responds with 404', () => {
        const id = 123456
        return supertest(app)
          .get(`/api/notes/${id}`)
          .expect(404, { error: { message: `Note doesn't exist`} })
      })
    })

    context(`Given there are articles in the database`, () => {
      const testFolders = makeFoldersArray()
      const testNotes = makeNotesArray()

      beforeEach('insert data', () => {
        return db
          .into('folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('notes')
              .insert(testNotes)
          })
      })

      it('responds with 200 and the specified note', () => {
        const id = 2 
        const expectedNote = testNotes[id - 1]
        return supertest(app)
          .get(`/api/notes/${id}`)
          .expect(200, expectedNote)
      })
    })

    context(`Given an XSS attack note`, () => {
      const testFolders = makeFoldersArray()
      const { maliciousNote, expectedNote } = makeMaliciousNote()

      beforeEach('insert malicious article', () => {
        return db
          .into('folders')
          .insert (testFolders)
          .then(() => {
            return db
              .into('notes')
              .insert(maliciousNote)
          })
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/notes/${maliciousNote.id}`)
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql(expectedNote.title)
            expect(res.body.content).to.eql(expectedNote.content)
          })
      })
    })
  })

  describe(`POST /api/notes`, () => {
    const testFolders = makeFoldersArray()

    beforeEach('insert folders', () => {
      return db 
        .into('folders')
        .insert(testFolders)
    })

    context(`Given a valid note`, () => {
      it(`creates a note and responds with 201 and the new note`, () => {
        const newNote = {
          title: 'New test note',
          content: 'New test note content',
          folder_id: 2
        }

        return supertest(app)
          .post('/api/notes')
          .send(newNote)
          .expect(201)
          .expect(res => {
            expect(res.body.title).to.eql(newNote.title)
            expect(res.body.content).to.eql(newNote.content)
            expect(res.body.folder_id).to.eql(newNote.folder_id)
            expect(res.body).to.have.property('id')
            expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`)
            const expected = new Intl.DateTimeFormat('en-US').format(new Date())
            const actual = new Intl.DateTimeFormat('en-US').format(new Date(res.body.modified))
            expect(actual).to.eql(expected)
          })
          .then(res => 
              supertest(app)
                .get(`/api/notes/${res.body.id}`)
                .expect(res.body)
            )
      })
    })

    context('Given an invalid note', () => {
      const requiredFields = [ 'title', 'content', 'folder_id' ]

      requiredFields.forEach(field => {
        const newNote = {
          title: 'New test note',
          content: 'New test note content',
          folder_id: 2
        }
        
        it(`It responds with 400 and an error message when '${field}' is missing`, () => {
          delete newNote[field]
          
          return supertest(app)
            .post('/api/notes')
            .send(newNote)
            .expect(400, {
              error: { message: `Missing '${field}' in request body`}
            })
        })
      })
    })

    context('Given XSS attack conentt', () => {
      it('removes XSS attack contebt', () => {
        const { maliciousNote, expectedNote } = makeMaliciousNote()
        return supertest(app)
          .post(`/api/notes`)
          .send(maliciousNote)
          .expect(201)
          .expect(res => {
            expect(res.body.title).to.eql(expectedNote.title)
            expect(res.body.content).to.eql(expectedNote.content)
          })
      })
    })
  })

  describe(`DELETE /api/notes/:id`, () => {
    context(`Given no notes`, () => {
      it(`responds with 404`, () => {
        const id = 12345
        return supertest(app)
          .delete(`/api/notes/${id}`)
          .expect(404, { error: { message: `Note doesn't exist` } })
      })
    })

    context(`Given there are notes in the database`, () => {
      const testFolders = makeFoldersArray()
      const testNotes = makeNotesArray()

      beforeEach('insert notes', () => {
        return db
          .into('folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('notes')
              .insert(testNotes)
          })
      })

      it('responds with 204 and removes the note', () => {
        const id = 2
        const expectedNotes = testNotes.filter(note => note.id !== id)
        return supertest(app)
          .delete(`/api/notes/${id}`)
          .expect(204)
          .then(res => 
            supertest(app)
              .get(`/api/notes`)
              .expect(expectedNotes)
          )
      })
    })

    describe(`PATCH /api/notes/:id`, () => {
      context(`Given no notes`, () => {
        it('responds with 404', () => {
          const id = 123456
          return supertest(app)
            .patch(`/api/notes/${id}`)
            .expect(404, { error: { message: `Note doesn't exist` } })
        })
      })

      context('Given there are notes in the database', () => {
        const testFolders = makeFoldersArray()
        const testNotes = makeNotesArray()

        beforeEach('insert notes', () => {
          return db 
            .into('folders')
            .insert(testFolders)
            .then(() => {
              return db
              .into('notes')
              .insert(testNotes)
          })
        })

        it('responds with 204 and updates the note', () => {
          const id = 2
          const updateNote = {
            title: 'update note title',
            content: 'updated note content',
            folder_id: 2
          }
          const expectedNote = {
            ...testNotes[id - 1],
            ...updateNote
          }
          return supertest(app)
            .patch(`/api/notes/${id}`)
            .send(updateNote)
            .expect(204)
            .then(res => 
              supertest(app)
                .get(`/api/notes/${id}`)
                .expect(expectedNote)
            )
        })

        it('responds with 400 when no required fields supplied', () => {
          const id = 2
          return supertest(app)
            .patch(`/api/notes/${id}`)
            .send({ irrelevantfield: 'foo'})
            .expect(400, {
              error: { message: `Request body must contain either 'title', 'content', or 'folder_id'`}
            })
        })

        it('responds with 204 when updating only a subset of fields', () => {
          const id = 2
          const updateNote = {
            title: 'updated note title'
          }
          const expectedNote = {
            ...testNotes[id - 1],
            ...updateNote
          }

          return supertest(app)
            .patch(`/api/notes/${id}`)
            .send({
              ...updateNote,
              ignore: 'This should not be in GET response'
            })
            .expect(204)
            .then(() => 
              supertest(app)
                .get(`/api/notes/${id}`)
                .expect(expectedNote)
            )
        })
      })
    })
  })
})