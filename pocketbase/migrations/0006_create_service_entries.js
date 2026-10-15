migrate(
  (app) => {
    const collection = new Collection({
      name: 'service_entries',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'date',
          type: 'date',
          required: true,
        },
        {
          name: 'servico',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: [
            'CENTRO CIRURGICO',
            'CIRURGIAS EXTERNAS',
            'LABORATORIO',
            'LITOTRIPSIA',
            'CONSULTORIO',
            'CLINICA GERAL',
          ],
        },
        {
          name: 'payment_method',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: [
            'CARTAO DE DEBITO',
            'CARTAO DE CREDITO',
            'ANTECIPACAO DE CARTAO DE CREDITO',
            'PIX',
            'DINHEIRO',
            'CHEQUE',
            'ALUGUEL DE SALAS',
            'TED',
          ],
        },
        {
          name: 'amount',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'notes',
          type: 'text',
          required: false,
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
        'CREATE INDEX idx_service_entries_date ON service_entries (date DESC)',
        'CREATE INDEX idx_service_entries_servico ON service_entries (servico)',
        'CREATE INDEX idx_service_entries_payment_method ON service_entries (payment_method)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('service_entries')
      app.delete(col)
    } catch (_) {}
  },
)
