function makeNotesArray() {
    return [
      {
        id: 1,
        title: 'test note 1',
        modified: '2029-01-22T16:28:32.615Z',
        folder_id: 3,
        content: 'test note 1 content',
      },
      {
        id: 2,
        title: 'test note 2',
        modified: '2018-08-15T23:00:00.000Z',
        folder_id: 1,
        content: 'test note 2 content'
      },
      {
        id: 3,
        title: 'test note 3',
        modified: '2019-01-04T00:00:00.000Z',
        folder_id: 2,
        content: 'test note 3 content'
      }
    ]
  }
  
  function makeMaliciousNote() {
    const maliciousNote = {
      id: 911,
      title: 'Naughty naughty very naughty <script>alert("xss");</script>',
      modified: '1919-12-22T16:28:32.615Z',
      folder_id: 2,
      content: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
    }
  
    const expectedNote = {
      ...maliciousNote,
      title:'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
      content: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
    }
  
    return {
      maliciousNote,
      expectedNote
    }
  }
  
  module.exports = {
    makeNotesArray,
    makeMaliciousNote,
  }