const FoldersService = {
  getAllFolders(knex) {
    return knex
      .select('*')
      .from('folders');
  },
  insertFolder(knex, newFolder) {
    return knex
      .insert(newFolder)
      .into('folders')
      .returning('*')
      .then( rows => {
        return rows[0];
      });
  },
  getById(knex, id) {
    return knex
      .select('*')
      .from('folders')
      .where('id', id)
      .first();
  },
  deleteById(knex, id) {
    return knex
      .from('folders')
      .where('id', id)
      .delete();
  },
  updateById(knex, id, newFolderData) {
    return knex
      .from('folders')
      .where('id', id)
      .update(newFolderData);
  }
};

module.exports = FoldersService;