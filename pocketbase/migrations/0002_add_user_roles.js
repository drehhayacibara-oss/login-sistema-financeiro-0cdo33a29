migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['direcao', 'gestao_financeira', 'recepcao'],
          maxSelect: 1,
          required: false,
          presentable: true,
        }),
      )
    }

    // User accounts are provisioned by an administrator. A logged-in user may
    // not create accounts or change their own role through the public API.
    users.createRule = null
    users.updateRule = 'id = @request.auth.id && @request.body.role = role'
    app.save(users)

    // Existing accounts predate role support. Keep them usable with the
    // least-privileged read-only profile until an administrator assigns another role.
    const records = app.findRecordsByFilter('_pb_users_auth_', '', '', 500, 0)
    for (let i = 0; i < records.length; i += 1) {
      if (!records[i].get('role')) {
        records[i].set('role', 'direcao')
        app.save(records[i])
      }
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (users.fields.getByName('role')) {
      users.fields.removeByName('role')
      users.createRule = ''
      users.updateRule = 'id = @request.auth.id'
      app.save(users)
    }
  },
)
