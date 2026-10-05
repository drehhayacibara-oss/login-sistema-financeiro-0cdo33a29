import { describe, it, expect } from 'vitest'
import { parseDateToISO, parseOFX, parseStatement } from './statementParser'
import { formatDatePtBR } from './transactions'

describe('parseDateToISO', () => {
  it('extrai corretamente a data de DTPOSTED OFX com fuso horario', () => {
    // Ex: 20241225120000.000[-3:GMT]
    const raw = '20241225120000.000' + String.fromCharCode(91) + '-3:GMT' + String.fromCharCode(93)
    expect(parseDateToISO(raw)).toBe('2024-12-25')
  })

  it('extrai corretamente DTPOSTED com timezone BRT', () => {
    const raw = '20240815143022' + String.fromCharCode(91) + '-03:EST' + String.fromCharCode(93)
    expect(parseDateToISO(raw)).toBe('2024-08-15')
  })

  it('extrai data de YYYYMMDD simples', () => {
    expect(parseDateToISO('20241225')).toBe('2024-12-25')
    expect(parseDateToISO('20230101')).toBe('2023-01-01')
  })

  it('extrai formato YYYYMMDDHHMMSS sem milissegundos', () => {
    expect(parseDateToISO('20241225120000')).toBe('2024-12-25')
  })

  it('extrai formato brasileiro DD/MM/YYYY com ou sem hora', () => {
    expect(parseDateToISO('25/12/2024')).toBe('2024-12-25')
    expect(parseDateToISO('25/12/2024 15:30:00')).toBe('2024-12-25')
    expect(parseDateToISO('05/01/2025')).toBe('2025-01-05')
  })

  it('extrai formato brasileiro curto DD/MM/YY', () => {
    expect(parseDateToISO('25/12/24')).toBe('2024-12-25')
    expect(parseDateToISO('01/02/25')).toBe('2025-02-01')
  })

  it('extrai formato ISO YYYY-MM-DD', () => {
    expect(parseDateToISO('2024-12-25')).toBe('2024-12-25')
    expect(parseDateToISO('2024-12-25T14:20:00Z')).toBe('2024-12-25')
    expect(parseDateToISO('2024-12-25 12:00:00.000Z')).toBe('2024-12-25')
  })

  it('retorna null para data vazia ou invalida', () => {
    expect(parseDateToISO('')).toBeNull()
    expect(parseDateToISO('   ')).toBeNull()
    expect(parseDateToISO('invalido')).toBeNull()
    expect(parseDateToISO('99/99/9999')).toBeNull()
  })
})

describe('parseOFX', () => {
  it('faz parse de OFX XML moderno com tags de fechamento e fuso horario', () => {
    const tz = String.fromCharCode(91) + '-3:GMT' + String.fromCharCode(93)
    const ofx = [
      'OFXHEADER:100',
      '<OFX>',
      '  <BANKMSGSRSV1>',
      '    <STMTTRNRS>',
      '      <STMTRS>',
      '        <BANKTRANLIST>',
      '          <STMTTRN>',
      '            <TRNTYPE>DEBIT</TRNTYPE>',
      `            <DTPOSTED>20241225120000.000${tz}</DTPOSTED>`,
      '            <TRNAMT>-150.00</TRNAMT>',
      '            <MEMO>PAGAMENTO FORNECEDOR</MEMO>',
      '          </STMTTRN>',
      '          <STMTTRN>',
      '            <TRNTYPE>CREDIT</TRNTYPE>',
      `            <DTPOSTED>20241226120000.000${tz}</DTPOSTED>`,
      '            <TRNAMT>5000.00</TRNAMT>',
      '            <MEMO>RECEBIMENTO CIRURGIA</MEMO>',
      '          </STMTTRN>',
      '        </BANKTRANLIST>',
      '      </STMTRS>',
      '    </STMTTRNRS>',
      '  </BANKMSGSRSV1>',
      '</OFX>',
    ].join('\n')

    const result = parseOFX(ofx, 'pj')
    expect(result.transactions.length).toBe(2)
    expect(result.transactions[0].date).toBe('2024-12-25')
    expect(result.transactions[0].amount).toBe(150)
    expect(result.transactions[0].type).toBe('expense')
    expect(result.transactions[0].hasValidDate).toBe(true)
    expect(result.transactions[1].date).toBe('2024-12-26')
    expect(result.transactions[1].amount).toBe(5000)
    expect(result.transactions[1].type).toBe('income')
    expect(result.transactions[1].hasValidDate).toBe(true)
  })

  it('faz parse de OFX SGML clássico bancário sem tags de fechamento', () => {
    const ofxSGML = [
      '<STMTTRN>',
      '<TRNTYPE>DEBIT',
      '<DTPOSTED>20241115120000',
      '<TRNAMT>-230.50',
      '<MEMO>COMPRA MATERIAIS',
      '<STMTTRN>',
      '<TRNTYPE>CREDIT',
      '<DTPOSTED>20241120100000',
      '<TRNAMT>1200.00',
      '<NAME>CONSULTA CLINICA',
    ].join('\n')

    const result = parseOFX(ofxSGML, 'pj')
    expect(result.transactions.length).toBe(2)
    expect(result.transactions[0].date).toBe('2024-11-15')
    expect(result.transactions[0].amount).toBe(230.5)
    expect(result.transactions[0].type).toBe('expense')
    expect(result.transactions[1].date).toBe('2024-11-20')
    expect(result.transactions[1].amount).toBe(1200)
    expect(result.transactions[1].type).toBe('income')
  })

  it('faz parse de OFX com múltiplas tags compactadas na mesma linha (formato banco Itaú/Bradesco inline)', () => {
    const inlineOfx =
      '<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20240905<TRNAMT>-75.30<MEMO>FARMACIA HOSPITALAR</STMTTRN>' +
      '<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20240906120000<TRNAMT>3500.00<MEMO>CIRURGIA EXTERNA</STMTTRN>'

    const result = parseOFX(inlineOfx, 'pj')
    expect(result.transactions.length).toBe(2)
    expect(result.transactions[0].date).toBe('2024-09-05')
    expect(result.transactions[0].amount).toBe(75.3)
    expect(result.transactions[0].type).toBe('expense')
    expect(result.transactions[1].date).toBe('2024-09-06')
    expect(result.transactions[1].amount).toBe(3500)
    expect(result.transactions[1].type).toBe('income')
  })

  it('usa DTUSER como fallback quando DTPOSTED não estiver presente', () => {
    const ofx = [
      '<STMTTRN>',
      '  <TRNTYPE>DEBIT</TRNTYPE>',
      '  <DTUSER>20241010120000</DTUSER>',
      '  <TRNAMT>-90.00</TRNAMT>',
      '  <MEMO>LITOTRIPSIA INSUMOS</MEMO>',
      '</STMTTRN>',
    ].join('\n')

    const result = parseOFX(ofx, 'pj')
    expect(result.transactions.length).toBe(1)
    expect(result.transactions[0].date).toBe('2024-10-10')
    expect(result.transactions[0].hasValidDate).toBe(true)
  })

  it('NUNCA preenche silenciosamente com a data de hoje quando data ausente no extrato', () => {
    const ofxWithoutDate = [
      '<STMTTRN>',
      '  <TRNTYPE>DEBIT</TRNTYPE>',
      '  <TRNAMT>-50.00</TRNAMT>',
      '  <MEMO>TAXA BANCARIA SEM DATA</MEMO>',
      '</STMTTRN>',
    ].join('\n')

    const result = parseOFX(ofxWithoutDate, 'pj')
    expect(result.transactions.length).toBe(1)
    expect(result.transactions[0].date).toBe('') // Nunca a data de hoje!
    expect(result.transactions[0].hasValidDate).toBe(false)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings.some((w) => w.includes('não possui data válida'))).toBe(true)
  })

  it('parseStatement direciona automaticamente para parseOFX ao detectar cabeçalho OFX', () => {
    const raw = 'OFXHEADER:100\n<OFX><STMTTRN><DTPOSTED>20240704<TRNAMT>100.00<MEMO>TESTE'
    const result = parseStatement(raw, 'pj')
    expect(result.format).toBe('ofx')
    expect(result.transactions.length).toBe(1)
    expect(result.transactions[0].date).toBe('2024-07-04')
  })
})

describe('formatDatePtBR', () => {
  it('formata YYYY-MM-DD para DD/MM/YYYY sem efeito colateral de fuso horario', () => {
    expect(formatDatePtBR('2024-12-25')).toBe('25/12/2024')
    expect(formatDatePtBR('2024-12-25 12:00:00.000Z')).toBe('25/12/2024')
    expect(formatDatePtBR('2024-12-25T12:00:00.000Z')).toBe('25/12/2024')
    expect(formatDatePtBR('2024-01-01')).toBe('01/01/2024')
  })

  it('preserva e formata strings brasileiras DD/MM/YYYY', () => {
    expect(formatDatePtBR('25/12/2024')).toBe('25/12/2024')
    expect(formatDatePtBR('05/04/2026')).toBe('05/04/2026')
  })

  it('retorna string vazia para entrada vazia', () => {
    expect(formatDatePtBR('')).toBe('')
  })
})
