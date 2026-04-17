import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

function uuid() {
  return crypto.randomUUID()
}

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error("Uso: npx tsx scripts/parse_ofx.ts <arquivo1.ofx> <arquivo2.ofx> ...")
  process.exit(1)
}

const CURRENT_SCHEMA_VERSION = 2

const nexusAccounts: any[] = []
const nexusCategories: any[] = []
const nexusTags: any[] = []
const nexusTransactions: any[] = []

const accountMap = new Map() // ACCTID => UUID
let catIncomeId: string | null = null
let catExpenseId: string | null = null

const getCategoryId = (type: 'INCOME' | 'EXPENSE') => {
  if (type === 'INCOME') {
    if (!catIncomeId) {
      catIncomeId = uuid()
      nexusCategories.push({
        id: catIncomeId,
        parentId: null,
        name: 'Receitas (Extrato)',
        icon: 'briefcase',
        color: '#22C55E',
        type: 'INCOME'
      })
    }
    return catIncomeId
  } else {
    if (!catExpenseId) {
      catExpenseId = uuid()
      nexusCategories.push({
        id: catExpenseId,
        parentId: null,
        name: 'Despesas (Extrato)',
        icon: 'tag',
        color: '#FF8A83',
        type: 'EXPENSE'
      })
    }
    return catExpenseId
  }
}

const getAccountId = (org: string, acctId: string) => {
  if (!accountMap.has(acctId)) {
    const newId = uuid()
    accountMap.set(acctId, newId)
    nexusAccounts.push({
      id: newId,
      name: `${org || 'Banco'} ${acctId}`,
      type: 'RETAIL',
      balance: 0,
      includeInBalance: true
    })
  }
  return accountMap.get(acctId)
}

// OFX date format parser: 20260406000000[-3:BRT]
function parseDate(dt: string) {
  if (!dt) return new Date().toISOString().split('T')[0]
  const match = dt.match(/^(\d{4})(\d{2})(\d{2})/)
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`
  }
  return new Date().toISOString().split('T')[0]
}

console.log(`Processando ${args.length} arquivo(s) de instrução OFX...`)

for (const arg of args) {
  const filePath = path.resolve(arg)
  if (!fs.existsSync(filePath)) {
    console.warn(`Aviso: Arquivo não encontrado - ${arg}`)
    continue
  }

  const content = fs.readFileSync(filePath, 'utf8')
  
  // Extrair metadados root
  const orgMatch = content.match(/<ORG>([^<]+)/)
  const org = orgMatch ? orgMatch[1].trim() : ''
  
  const acctMatch = content.match(/<ACCTID>([^<]+)/)
  const acct = acctMatch ? acctMatch[1].trim() : 'Desconhecida'
  
  const currentAccountId = getAccountId(org, acct)

  // Extrair array de blocos de transações (uso de 'gs' ignorar quebra de linhas se o arquivo estiver comprimido)
  const stmttrs = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/g) || []
  
  for (const str of stmttrs) {
    const trnAmtMatch = str.match(/<TRNAMT>([^<\n]+)/)
    const fitIdMatch = str.match(/<FITID>([^<\n]+)/)
    const memoMatch = str.match(/<MEMO>([^<\n]+)/)
    const dtMatch = str.match(/<DTPOSTED>([^<\n]+)/)

    const rawAmt = trnAmtMatch ? parseFloat(trnAmtMatch[1]) : 0
    const amt = Math.abs(rawAmt)
    const type = rawAmt >= 0 ? 'INCOME' : 'EXPENSE'
    
    const idStr = fitIdMatch ? fitIdMatch[1].trim() : uuid()
    const description = memoMatch ? memoMatch[1].trim() : 'Transação Banco'
    const dateStr = dtMatch ? parseDate(dtMatch[1].trim()) : new Date().toISOString().split('T')[0]

    // Garantia de idempotência via FITID
    const existing = nexusTransactions.find(t => t.id === idStr)
    if (!existing) {
      nexusTransactions.push({
        id: idStr,
        accountId: currentAccountId,
        categoryId: getCategoryId(type),
        amount: amt,
        type: type,
        date: dateStr,
        description: description,
        isPaid: true,
        tags: []
      })
    }
  }
}

const nexusDataFile = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  user: {
    name: 'Fabio Dassan',
    email: 'fabricando@gmail.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  settings: {
    fileCreatedAt: new Date().toISOString(),
    fileUpdatedAt: new Date().toISOString(),
    auditLogRetentionLimit: 200
  },
  accounts: nexusAccounts,
  categories: nexusCategories,
  tags: nexusTags,
  // Sort from oldest to newest by default
  transactions: nexusTransactions.sort((a,b) => a.date.localeCompare(b.date)),
  auditLog: [],
  deletedIds: []
}

const distFile = path.resolve('data/nexus-import-ofx.json')
fs.writeFileSync(distFile, JSON.stringify(nexusDataFile, null, 2), 'utf8')

console.log('✅ Extração e Compilação OFX finalizada!')
console.log(`📊 Exportados para ${distFile}:\n  - ${nexusTransactions.length} transações validadas (protegidas sob idempotência).`)
