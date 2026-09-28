migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    const transactions = new Collection({
      name: 'transactions',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && @request.body.user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: users.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['income', 'expense'],
          maxSelect: 1,
        },
        {
          name: 'amount',
          type: 'number',
          required: true,
          min: 0.01,
        },
        {
          name: 'description',
          type: 'text',
          required: true,
          min: 1,
          max: 200,
        },
        {
          name: 'category',
          type: 'text',
          required: true,
          min: 1,
          max: 80,
        },
        {
          name: 'date',
          type: 'date',
          required: true,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_transactions_user_date ON transactions (user, date DESC)',
        'CREATE INDEX idx_transactions_type ON transactions (type)',
      ],
    })

    app.save(transactions)

    // Seed sample transactions for drehhayacibara@gmail.com so dashboard works immediately
    try {
      const adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'drehhayacibara@gmail.com')
      if (adminUser) {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')

        const sampleItems = [
          {
            type: 'income',
            amount: 8500.0,
            description: 'Prestação de Serviços de Consultoria',
            category: 'Serviços',
            date: `${year}-${month}-02 10:00:00.000Z`,
          },
          {
            type: 'expense',
            amount: 1450.0,
            description: 'Aluguel do Escritório Central',
            category: 'Infraestrutura',
            date: `${year}-${month}-05 14:30:00.000Z`,
          },
          {
            type: 'expense',
            amount: 320.5,
            description: 'Assinatura de Software e Ferramentas Cloud',
            category: 'Tecnologia',
            date: `${year}-${month}-08 09:15:00.000Z`,
          },
          {
            type: 'income',
            amount: 4200.0,
            description: 'Honorários de Gestão Financeira',
            category: 'Honorários',
            date: `${year}-${month}-12 11:20:00.000Z`,
          },
          {
            type: 'expense',
            amount: 580.0,
            description: 'Internet Fibra Óptica & Telefonia',
            category: 'Infraestrutura',
            date: `${year}-${month}-15 16:45:00.000Z`,
          },
          {
            type: 'expense',
            amount: 890.0,
            description: 'Campanha de Marketing Digital',
            category: 'Marketing',
            date: `${year}-${month}-18 13:00:00.000Z`,
          },
          {
            type: 'income',
            amount: 3100.0,
            description: 'Recebimento de Faturamento Pontual',
            category: 'Vendas',
            date: `${year}-${month}-20 17:10:00.000Z`,
          },
          {
            type: 'expense',
            amount: 410.2,
            description: 'Material de Escritório e Suprimentos',
            category: 'Operacional',
            date: `${year}-${month}-22 10:30:00.000Z`,
          },
        ]

        for (const item of sampleItems) {
          const record = new Record(transactions)
          record.set('user', adminUser.id)
          record.set('type', item.type)
          record.set('amount', item.amount)
          record.set('description', item.description)
          record.set('category', item.category)
          record.set('date', item.date)
          app.save(record)
        }
      }
    } catch (err) {
      console.log('Error seeding transactions for admin user: ' + err)
    }
  },
  (app) => {
    try {
      const transactions = app.findCollectionByNameOrId('transactions')
      app.delete(transactions)
    } catch (_) {}
  },
)
