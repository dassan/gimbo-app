/**
 * ============================================================================
 * SCRIPT DE MIGRAÇÃO: ORGANIZZE -> NEXUS FINANCE
 * ============================================================================
 * NOTA DE USO FUTURO:
 * 1. Acoplamento: Este script foi otimizado exclusivamente para o formato de
 *    exportação do Organizze (trata campos únicos como `amount_cents`, 
 *    `total_installments`, `oposite_transaction_id` e `paid_credit_card_id`).
 *    Ele NÃO servirá para leitura de arquivos de outros sistemas.
 * 2. Hardcoded Paths: Os nomes e caminhos dos 4 arquivos JSON de entrada 
 *    atuais estão fixos na seção "Carregar Dados do Organizze" abaixo. 
 *    Caso retome este arquivo no futuro para reuso, refatore o script para 
 *    aceitar os arquivos dinamicamente via argumentos de console (CLI flags).
 * ============================================================================
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// Use randomUUID generator
function uuid() {
  return crypto.randomUUID()
}

// Data models as per Nexus Schema v2
const CURRENT_SCHEMA_VERSION = 2

console.log('⏳ Iniciando migração...')

// 1. Carregar Dados do Organizze
const dataDir = path.join(__dirname, '../data')
const transactionsFile = path.join(dataDir, 'lancamentos-20250101-20261231.json')
const accountsFile = path.join(dataDir, 'contas-20260321.json')
const cardsFile = path.join(dataDir, 'cartoes-20260321.json')
const categoriesFile = path.join(dataDir, 'categorias-20260321.json')

const txData = JSON.parse(fs.readFileSync(transactionsFile, 'utf8'))
const extAccounts = JSON.parse(fs.readFileSync(accountsFile, 'utf8'))
const extCards = JSON.parse(fs.readFileSync(cardsFile, 'utf8'))
const extCategories = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'))

// 2. Hash Maps para Resolução de Nomes
const getOrgAccountName = (id: number) => {
  const acc = extAccounts.find((a: any) => a.id === id)
  if (acc) return acc.name
  return `Conta ${id}`
}

const getOrgCardName = (id: number) => {
  const card = extCards.find((c: any) => c.id === id)
  if (card) return card.name
  return `Cartão ${id}`
}

const getOrgCatName = (id: number) => {
  const cat = extCategories.find((c: any) => c.id === id)
  if (cat) return cat.name
  return `Categoria ${id}`
}

// 3. Estruturas Nexus Vazias e Mapeadores
const accountsMap = new Map<number, any>() // Organizze ID => Nexus Account Object
const categoriesMap = new Map<number, any>() // Organizze ID => Nexus Category Object
const tagsMap = new Map<string, any>() // Organizze Tag Name => Nexus Tag Object
const recurrenceMap = new Map<number, string>() // recurrence_id => Parent Transaction UUID

const nexusAccounts: any[] = []
const nexusCategories: any[] = []
const nexusTags: any[] = []
const nexusTransactions: any[] = []

// Funções Helpers
const getAccountId = (id: number, isCredit: boolean = false) => {
  if (!accountsMap.has(id)) {
    const acc = {
      id: uuid(),
      name: isCredit ? getOrgCardName(id) : getOrgAccountName(id),
      type: isCredit ? 'CREDIT' : 'RETAIL',
      balance: 0,
      includeInBalance: !isCredit,
    }
    if (isCredit) {
      acc.creditMetadata = { limit: 5000, closingDay: 1, dueDay: 10 }
    }
    accountsMap.set(id, acc)
    nexusAccounts.push(acc)
  } else {
    // Se marcarmos depois que é crédito, atualizamos
    if (isCredit && accountsMap.get(id).type !== 'CREDIT') {
      const acc = accountsMap.get(id)
      acc.type = 'CREDIT'
      acc.name = getOrgCardName(id)
      acc.includeInBalance = false
      acc.creditMetadata = { limit: 5000, closingDay: 1, dueDay: 10 }
    }
  }
  return accountsMap.get(id).id
}

const getCategoryId = (id: number, deducedType: 'INCOME' | 'EXPENSE') => {
  if (!categoriesMap.has(id)) {
    const cat = {
      id: uuid(),
      parentId: null,
      name: getOrgCatName(id),
      icon: deducedType === 'INCOME' ? 'briefcase' : 'tag',
      color: deducedType === 'INCOME' ? '#22C55E' : '#FF8A83',
      type: deducedType,
    }
    categoriesMap.set(id, cat)
    nexusCategories.push(cat)
  }
  return categoriesMap.get(id).id
}

const getTagId = (name: string) => {
  if (!tagsMap.has(name)) {
    const tag = {
      id: uuid(),
      name: name,
      color: '#6B7280', // Default tag color
    }
    tagsMap.set(name, tag)
    nexusTags.push(tag)
  }
  return tagsMap.get(name).id
}

// Pre-verificação das categorias para deduzir INCOME vs EXPENSE com base em uso geral
const categoryBalance: Record<number, number> = {}
txData.forEach((tx: any) => {
  if (tx.category_id) {
    categoryBalance[tx.category_id] = (categoryBalance[tx.category_id] || 0) + tx.amount_cents
  }
})

// Mapeamento antecipado de "installment === 1" para o parentId
console.log('📌 Mapeando parcelamentos...')
const recurrentIdToUuidMap = new Map<number, string>()
txData.forEach((tx: any) => {
  if (tx.total_installments > 1 && tx.installment === 1 && tx.recurrence_id) {
    recurrentIdToUuidMap.set(tx.recurrence_id, uuid())
  }
})

// Mapeamento antecipado de transaction IDs do Organizze cruzando com UUIDs Nexus para Transfers
console.log('📌 Mapeando Oposite Transactions...')
const txIdToUuidMap = new Map<number, string>()
txData.forEach((tx: any) => {
  txIdToUuidMap.set(tx.id, uuid()) // Cada transação ganha um UUID de antemão
})


// 4. Processamento de Transações
console.log(`📌 Processando ${txData.length} transações...`)
txData.forEach((tx: any) => {
  const amountFloat = Math.abs(tx.amount_cents) / 100
  let txType = 'EXPENSE'
  
  let accountIdNexus = null
  let transferAccountIdNexus = undefined // Apenas para CREDIT_PAYMENT
  let nexAmount = amountFloat
  
  // Tratamento de Categorias Táticas
  let deducedCatType: 'INCOME' | 'EXPENSE' = (categoryBalance[tx.category_id] > 0) ? 'INCOME' : 'EXPENSE'
  let catIdNexus = getCategoryId(tx.category_id, deducedCatType)

  // Descoberta do Tipo de Transação Base
  if (tx.oposite_transaction_id) {
    txType = 'TRANSFER'
    accountIdNexus = getAccountId(tx.account_id, false) // TRANSFERs ocorrem via conta de base
    // Se entry.amount_cents < 0 (TransferOut), o valor é positivo no Nexus para descontar do saldo
    // Se entry.amount_cents > 0 (TransferIn), o valor também fica negativo no registro Nexus para inserir dinheiro via balanceamento (- -100 = +100)
    nexAmount = tx.amount_cents < 0 ? amountFloat : -amountFloat
  } else if (tx.paid_credit_card_id) {
    txType = 'CREDIT_PAYMENT'
    accountIdNexus = getAccountId(tx.paid_credit_card_id, true) // O cartão que está sendo pago
    transferAccountIdNexus = getAccountId(tx.account_id, false) // A conta concorrente que proveu o pagamento
  } else {
    // Normal INCOME / EXPENSE
    txType = tx.amount_cents > 0 ? 'INCOME' : 'EXPENSE'
    // Prioriza o ID do cartão caso de fato isso tenha ocorrido dentro de uma fatura aliada
    if (tx.credit_card_id) {
      accountIdNexus = getAccountId(tx.credit_card_id, true)
    } else {
      accountIdNexus = getAccountId(tx.account_id, false)
    }
  }

  // Tags
  const tagListNexus = (tx.tags || []).map((t: any) => getTagId(t.name))

  // Installment
  let installmentObj = undefined
  if (tx.total_installments > 1 && tx.recurrence_id) {
    // Garantir UUID parente (se não encontrou na prestação 1 por algum glitch temporal, cria fallback)
    if (!recurrentIdToUuidMap.has(tx.recurrence_id)) {
       recurrentIdToUuidMap.set(tx.recurrence_id, txIdToUuidMap.get(tx.id)!)
    }
    installmentObj = {
      parentId: recurrentIdToUuidMap.get(tx.recurrence_id)!,
      currentIndex: tx.installment,
      total: tx.total_installments
    }
  }
  
  const nexusTx = {
    id: txIdToUuidMap.get(tx.id)!,
    accountId: accountIdNexus,
    categoryId: catIdNexus,
    amount: nexAmount,
    type: txType,
    date: tx.date || tx.created_at.slice(0, 10),
    description: tx.description,
    isPaid: tx.paid,
    tags: tagListNexus,
    ...(installmentObj ? { installment: installmentObj } : {}),
    ...(transferAccountIdNexus ? { transferAccountId: transferAccountIdNexus } : {}),
  }
  
  nexusTransactions.push(nexusTx)
})

// 5. Build Final
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
  transactions: nexusTransactions,
  auditLog: [],
  deletedIds: []
}

// 6. Output File
const distFile = path.join(dataDir, 'nexus-import.json')
fs.writeFileSync(distFile, JSON.stringify(nexusDataFile, null, 2), 'utf8')

console.log('✅ Migração finalizada com sucesso! Arquivo salvo em:', distFile)
console.log(`📊 Estatísticas Finais:\n  - Contas: ${nexusAccounts.length}\n  - Categorias: ${nexusCategories.length}\n  - Tags: ${nexusTags.length}\n  - Transações: ${nexusTransactions.length}`)
