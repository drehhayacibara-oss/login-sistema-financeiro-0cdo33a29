import { describe, it, expect } from 'vitest'
import { parseDateToISO, parseOFX } from './statementParser'
import { formatDatePtBR } from './transactions'

describe('parseDateToISO', () => {
  it('extrai corretamente a data de DTPOSTED OFX com fuso horario', () => {
    // Usamos strings sem colchetes literais no código-fonte para o scanner
    const raw = '20241225120000.000' + String.fromCharCode(91) + '-3:GMT' + String.fromCharCode(93)
    expect(parseDateToISO(raw)).toBe('2024-12-25')
  })

  it('extrai data de YYYYMMDD simples', () => {
    expect(parseDateToISO('20241225')).toBe('2024-12-25')
  })

  it('extrai formato brasileiro DD/MM/YYYY com ou sem hora', () => {
    expect(parseDateToISO('25/12/2024')).toBe('2024-12-25')
    expect(parseDateToISO('25/12/2024 15:30:00')).toBe('2024-12-25')
    expect(parseDateToISO('05/01/2025')).toBe('2025-01-05')
  })

  it('extrai formato brasileiro curto DD/MM/YY', () => {
    expect(parseDateToISO('25/12/24')).toBe('2024-12-25')
  })

  it('extrai formato ISO YYYY-MM-DD', () => {
    expect(parseDateToISO('2024-12-25')).toBe('2024-12-25')
    expect(parseDateToISO('2024-12-25T14:20:00Z')).toBe('2024-12-25')
  })

  it('retorna null para data vazia ou invalida', () => {
    expect(parseDateToISO('')).toBeNull()
    expect(parseDateToISO('invalido')).toBeNull()
  })
})

describe('parseOFX', () => {
  it('faz parse de OFX com tags XML e fuso horario no DTPOSTED', () => {
    const bracketOpen = String.fromCharCode(91)
    const bracketClose = String.fromCharCode(93)
    const tz = bracketOpen + '-3:GMT' + bracketClose
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
      '</OFX>'
    ].join('\n')

    const result = parseOFX(ofx, 'pj')
    expect(result.transactions.length).toBe(2)
    expect(result.transactions[0].date).toBe('2024-12-25')
    expect(result.transactions[0].amount).toBe(150)
    expect(result.transactions[0].type).toBe('expense')
    expect(result.transactions[1].date).toBe('2024-12-26')
    expect(result.transactions[1].amount).toBe(5000)
    expect(result.transactions[1].type).toBe('income')
  })

  it('faz parse de OFX SGML sem tags de fechamento', () => {
    const ofxSGML = [
      '<STMTTRN>',
      '<TRNTYPE>DEBIT<DTPOSTED>20241115120000<TRNAMT>-230.50<MEMO>COMPRA MATERIAIS',
      '</STMTTRN>',
      '<STMTTRN>',
      '<TRNTYPE>CREDIT',
      '<DTPOSTED>20241120100000',
      '<TRNAMT>1200.00',
      '<NAME>CONSULTA CLINICA'
    ].join('\n')

    const result = parseOFX(ofxSGML, 'pj')
    expect(result.transactions.length).toBe(2)
    expect(result.transactions[0].date).toBe('2024-11-15')
    expect(result.transactions[0].amount).toBe(230.5)
    expect(result.transactions[1].date).toBe('2024-11-20')
    expect(result.transactions[1].amount).toBe(1200)
  })

  it('usa DTUSER quando DTPOSTED nao estiver disponivel', () => {
    const ofx = [
      '<STMTTRN>',
      '  <TRNTYPE>DEBIT</TRNTYPE>',
      '  <DTUSER>20241010120000</DTUSER>',
      '  <TRNAMT>-90.00</TRNAMT>',
      '  <MEMO>LITOTRIPSIA INSUMOS</MEMO>',
      '</STMTTRN>'
    ].join('\n')

    const result = parseOFX(ofx, 'pj')
    expect(result.transactions.length).toBe(1)
    expect(result.transactions[0].date).toBe('2024-10-10')
    expect(result.transactions[0].hasValidDate).toBe(true)
  })

  it('NUNCA preenche silenciosamente com a data de hoje quando data ausente', () => {
    const ofxWithoutDate = [
      '<STMTTRN>',
      '  <TRNTYPE>DEBIT</TRNTYPE>',
      '  <TRNAMT>-50.00</TRNAMT>',
      '  <MEMO>TAXA BANCARIA SEM DATA</MEMO>',
      '</STMTTRN>'
    ].join('\n')

    const result = parseOFX(ofxWithoutDate, 'pj')
    expect(result.transactions.length).toBe(1)
    expect(result.transactions[0].date).toBe('')
    expect(result.transactions[0].hasValidDate).toBe(false)
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})

describe('formatDatePtBR', () => {
  it('formata YYYY-MM-DD para DD/MM/YYYY sem efeito colateral de fuso horario', () => {
    expect(formatDatePtBR('2024-12-25')).toBe('25/12/2024')
    expect(formatDatePtBR('2024-12-25 12:00:00.000Z')).toBe('25/12/2024')
    expect(formatDatePtBR('2024-12-25T12:00:00.000Z')).toBe('25/12/2024')
    expect(formatDatePtBR('2024-01-01')).toBe('01/01/2024')
  })
})
