migrate(
  (app) => {
    const readManagement = "@request.auth.id != '' && (@request.auth.role = \"direcao\" || @request.auth.role = \"gestao_financeira\")"
    const readCash = "@request.auth.id != ''"
    const manage = "@request.auth.id != '' && @request.auth.role = \"gestao_financeira\""
    const definitions = [
      {
        name: 'financial_accounts',
        receptionRead: false,
        extraFields: [
          { name: 'account_type', type: 'select', required: true, values: ['cash', 'bank', 'credit_card', 'other'], maxSelect: 1 },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_financial_accounts_name_active ON financial_accounts (name COLLATE NOCASE) WHERE active = 1',
        ],
      },
      {
        name: 'financial_categories',
        receptionRead: true,
        extraFields: [
          { name: 'direction', type: 'select', required: true, values: ['income', 'expense'], maxSelect: 1 },
          { name: 'entity', type: 'select', required: true, values: ['pf', 'pj', 'both'], maxSelect: 1 },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_financial_categories_name_active ON financial_categories (name COLLATE NOCASE) WHERE active = 1',
          'CREATE INDEX idx_financial_categories_direction ON financial_categories (direction)',
        ],
      },
      {
        name: 'financial_payment_methods',
        receptionRead: true,
        extraFields: [],
        indexes: [
          'CREATE UNIQUE INDEX idx_financial_payment_methods_name_active ON financial_payment_methods (name COLLATE NOCASE) WHERE active = 1',
        ],
      },
      {
        name: 'financial_doctors',
        receptionRead: false,
        extraFields: [
          { name: 'crm', type: 'text', required: false, max: 40 },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_financial_doctors_name_active ON financial_doctors (name COLLATE NOCASE) WHERE active = 1',
          'CREATE INDEX idx_financial_doctors_crm ON financial_doctors (crm)',
        ],
      },
      {
        name: 'financial_insurers',
        receptionRead: false,
        extraFields: [],
        indexes: [
          'CREATE UNIQUE INDEX idx_financial_insurers_name_active ON financial_insurers (name COLLATE NOCASE) WHERE active = 1',
        ],
      },
      {
        name: 'financial_cost_centers',
        receptionRead: true,
        extraFields: [],
        indexes: [
          'CREATE UNIQUE INDEX idx_financial_cost_centers_name_active ON financial_cost_centers (name COLLATE NOCASE) WHERE active = 1',
        ],
      },
    ]

    for (let i = 0; i < definitions.length; i += 1) {
      const definition = definitions[i]
      const fields = [
        { name: 'name', type: 'text', required: true, min: 1, max: 160 },
        { name: 'description', type: 'text', required: false, max: 300 },
      ]
      for (let j = 0; j < definition.extraFields.length; j += 1) {
        fields.push(definition.extraFields[j])
      }
      fields.push({ name: 'active', type: 'bool', required: true })
      fields.push({ name: 'created', type: 'autodate', onCreate: true, onUpdate: false })
      fields.push({ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true })

      const collection = new Collection({
        name: definition.name,
        type: 'base',
        listRule: definition.receptionRead ? readCash : readManagement,
        viewRule: definition.receptionRead ? readCash : readManagement,
        createRule: manage + ' && @request.body.active = true',
        updateRule: manage + ' && active = true && @request.body.active = true',
        deleteRule: null,
        fields: fields,
        indexes: definition.indexes,
      })
      app.save(collection)
    }

    const pjIncome = [
      'CARTAO DE DEBITO', 'CARTAO DE CREDITO', 'ANTECIPACAO DE CARTAO DE CREDITO',
      'PIX', 'DINHEIRO', 'CHEQUE', 'ALUGUEL DE SALAS', 'TED',
    ]
    const pjExpense = [
      'ALUGUEL EXTERNO', 'APLICACAO DE MEDICACAO EXTERNAS', 'ASSOCIAÇÃO/ENTIDADES E ANUIDADES',
      'COLETA RESIDENCIA', 'CONTADOR', 'CONVENIO', 'COPA', 'DEPOSITOS BANCARIOS',
      'DESPESAS PREDIAIS', 'EMPRESTIMO', 'ESTERILIZAÇÃO', 'FORNECEDORES DE OPME',
      'FORNECEDORES MATERIAS E MEDICAMENTOS', 'HONORARIO ANESTESISTA', 'IMPOSTOS FEDERAIS',
      'IMPOSTOS MUNICIPAIS', 'INVESTIMENTOS', 'JUROS BANCARIOS', 'LABORATORIO DE APOIO',
      'MANUTENÇÃO', 'MARKETING/PROPAGANDA', 'MATERIAL DE ESCRITORIO',
      'MATERIAL DE LIMPEZA/HIGIENE', 'PARCELAMENTO DE IMPOSTOS', 'REFEIÇÃO/HOTELARIA',
      'REPASSE MEDICO', 'SALARIOS', 'SEGUROS', 'TARIFAS BANCARIAS', 'TELEFONIA/INTERNET',
    ]
    const pfIncome = ['APOSENTADORIA INSTITUTO', 'APOSENTADORIA INSS', 'OUTRAS RECEITAS', 'PROLABORE']
    const pfExpense = [
      'CASA DA AVENIDA 3', 'REFORMA', 'FILHOS', 'CASA DA AVENIDA 47', 'CARROS E MOTOS',
      'CARTOES', 'TAXA E JUROS BANCARIOS', 'EMPRESTIMO', 'INVESTIMENTO', 'DESPESAS EXTRAS',
    ]

    const seeds = [
      { collection: 'financial_accounts', name: 'Caixa Recepção', account_type: 'cash', description: 'Conta inicial do caixa de recepção.' },
      { collection: 'financial_payment_methods', name: 'Dinheiro', description: 'Forma de pagamento em espécie.' },
      { collection: 'financial_payment_methods', name: 'Cartão', description: 'Forma de pagamento por cartão.' },
      { collection: 'financial_payment_methods', name: 'Cheque', description: 'Forma de pagamento por cheque.' },
      { collection: 'financial_doctors', name: 'Dr. Edson', crm: 'CRM 51758/SP', description: 'Cadastro inicial de médico.' },
      { collection: 'financial_insurers', name: 'Particular', description: 'Atendimento particular.' },
      { collection: 'financial_cost_centers', name: 'CENTRO CIRURGICO', description: 'Centro de custo oficial usado no histórico da DRE.' },
      { collection: 'financial_cost_centers', name: 'CIRURGIAS EXTERNAS', description: 'Centro de custo oficial usado no histórico da DRE.' },
      { collection: 'financial_cost_centers', name: 'LABORATORIO', description: 'Centro de custo oficial usado no histórico da DRE.' },
      { collection: 'financial_cost_centers', name: 'LITOTRIPSIA', description: 'Centro de custo oficial usado no histórico da DRE.' },
      { collection: 'financial_cost_centers', name: 'CONSULTORIO', description: 'Centro de custo oficial usado no histórico da DRE.' },
      { collection: 'financial_cost_centers', name: 'CLINICA GERAL', description: 'Centro de custo oficial usado no histórico da DRE.' },
      { collection: 'financial_categories', name: 'Consulta', direction: 'income', entity: 'both', description: 'Categoria inicial de atendimento; usada na fixture de aceite.' },
    ]

    for (let i = 0; i < pjIncome.length; i += 1) {
      seeds.push({ collection: 'financial_categories', name: pjIncome[i], direction: 'income', entity: 'pj', description: '' })
    }
    for (let i = 0; i < pjExpense.length; i += 1) {
      seeds.push({ collection: 'financial_categories', name: pjExpense[i], direction: 'expense', entity: pjExpense[i] === 'EMPRESTIMO' ? 'both' : 'pj', description: '' })
    }
    for (let i = 0; i < pfIncome.length; i += 1) {
      seeds.push({ collection: 'financial_categories', name: pfIncome[i], direction: 'income', entity: 'pf', description: '' })
    }
    for (let i = 0; i < pfExpense.length; i += 1) {
      if (pfExpense[i] !== 'EMPRESTIMO') {
        seeds.push({ collection: 'financial_categories', name: pfExpense[i], direction: 'expense', entity: 'pf', description: '' })
      }
    }

    for (let i = 0; i < seeds.length; i += 1) {
      const seed = seeds[i]
      let exists = false
      try {
        app.findFirstRecordByData(seed.collection, 'name', seed.name)
        exists = true
      } catch (_) {}
      if (exists) continue

      const record = new Record(app.findCollectionByNameOrId(seed.collection))
      record.set('name', seed.name)
      record.set('description', seed.description || '')
      record.set('active', true)
      if (seed.account_type) record.set('account_type', seed.account_type)
      if (seed.direction) record.set('direction', seed.direction)
      if (seed.entity) record.set('entity', seed.entity)
      if (seed.crm) record.set('crm', seed.crm)
      app.save(record)
    }
  },
  (app) => {
    const names = [
      'financial_cost_centers',
      'financial_insurers',
      'financial_doctors',
      'financial_payment_methods',
      'financial_categories',
      'financial_accounts',
    ]
    for (let i = 0; i < names.length; i += 1) {
      app.delete(app.findCollectionByNameOrId(names[i]))
    }
  },
)
