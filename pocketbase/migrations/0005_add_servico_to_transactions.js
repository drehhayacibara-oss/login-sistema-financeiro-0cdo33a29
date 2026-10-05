migrate(
  (app) => {
    const transactions = app.findCollectionByNameOrId('transactions')

    if (!transactions.fields.getByName('servico')) {
      transactions.fields.add(
        new TextField({
          name: 'servico',
          required: false,
          max: 120,
        }),
      )
      app.save(transactions)
    }
  },
  (app) => {
    try {
      const transactions = app.findCollectionByNameOrId('transactions')
      const field = transactions.fields.getByName('servico')
      if (field) {
        transactions.fields.removeByName('servico')
        app.save(transactions)
      }
    } catch (_) {}
  },
)
