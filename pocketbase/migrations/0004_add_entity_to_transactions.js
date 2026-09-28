migrate(
  (app) => {
    const transactions = app.findCollectionByNameOrId('transactions')

    if (!transactions.fields.getByName('entity')) {
      transactions.fields.add(
        new SelectField({
          name: 'entity',
          required: false,
          values: ['pf', 'pj'],
          maxSelect: 1,
        }),
      )
      app.save(transactions)
    }

    // Atualizar todas as transações existentes sem entity ou criadas anteriormente para 'pj'
    try {
      app
        .db()
        .newQuery("UPDATE transactions SET entity = 'pj' WHERE entity IS NULL OR entity = ''")
        .execute()
    } catch (err) {
      console.log('Error updating transactions entity to pj: ' + err)
    }
  },
  (app) => {
    try {
      const transactions = app.findCollectionByNameOrId('transactions')
      const field = transactions.fields.getByName('entity')
      if (field) {
        transactions.fields.removeByName('entity')
        app.save(transactions)
      }
    } catch (_) {}
  },
)
