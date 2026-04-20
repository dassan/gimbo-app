import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TagsView from '@/pages/Analytics/TagsView'
import type { Tag, Transaction } from '@/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const APR_START = new Date(2026, 3, 1)
const APR_END = new Date(2026, 3, 30)
const SHADOW = 'shadow-card'

function makeTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: 'tag-1',
    name: 'projeto',
    color: '#3B82F6',
    ...overrides,
  }
}

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    accountId: 'acc-1',
    categoryId: 'cat-1',
    amount: 100,
    type: 'EXPENSE',
    date: '2026-04-10',
    description: 'Test',
    isPaid: true,
    tags: ['tag-1'],
    ...overrides,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-04-15'))
})

// ─── R-15: No-data empty state ────────────────────────────────────────────────

describe('TagsView — R-15: empty state', () => {
  it('shows no-data message when there are no transactions', () => {
    render(
      <TagsView
        transactions={[]}
        tags={[makeTag()]}
        startDate={APR_START}
        endDate={APR_END}
        includeUnpaid={true}
        shadowClass={SHADOW}
      />
    )
    expect(screen.getByText('analytics.tags.noData')).toBeInTheDocument()
  })

  it('shows no-data message when transactions have no tags', () => {
    render(
      <TagsView
        transactions={[makeTx({ tags: [] })]}
        tags={[makeTag()]}
        startDate={APR_START}
        endDate={APR_END}
        includeUnpaid={true}
        shadowClass={SHADOW}
      />
    )
    expect(screen.getByText('analytics.tags.noData')).toBeInTheDocument()
  })

  it('shows no-data when tags list is empty (no tags configured)', () => {
    render(
      <TagsView
        transactions={[makeTx()]}
        tags={[]}
        startDate={APR_START}
        endDate={APR_END}
        includeUnpaid={true}
        shadowClass={SHADOW}
      />
    )
    expect(screen.getByText('analytics.tags.noData')).toBeInTheDocument()
  })

  it('shows no-data when all transactions are outside the period', () => {
    render(
      <TagsView
        transactions={[makeTx({ date: '2025-01-10', tags: ['tag-1'] })]}
        tags={[makeTag()]}
        startDate={APR_START}
        endDate={APR_END}
        includeUnpaid={true}
        shadowClass={SHADOW}
      />
    )
    expect(screen.getByText('analytics.tags.noData')).toBeInTheDocument()
  })

  it('excludes CREDIT_PAYMENT from tag aggregation', () => {
    render(
      <TagsView
        transactions={[makeTx({ type: 'CREDIT_PAYMENT', amount: 9999, tags: ['tag-1'] })]}
        tags={[makeTag()]}
        startDate={APR_START}
        endDate={APR_END}
        includeUnpaid={true}
        shadowClass={SHADOW}
      />
    )
    expect(screen.getByText('analytics.tags.noData')).toBeInTheDocument()
  })
})

// ─── R-15: Descending ranking ─────────────────────────────────────────────────

describe('TagsView — R-15: descending ranking', () => {
  it('renders the section title for expense tags', () => {
    const tags = [makeTag({ id: 'tag-1', name: 'projeto' })]
    render(
      <TagsView
        transactions={[makeTx({ tags: ['tag-1'], amount: 200 })]}
        tags={tags}
        startDate={APR_START}
        endDate={APR_END}
        includeUnpaid={true}
        shadowClass={SHADOW}
      />
    )
    expect(screen.getByText('analytics.tags.expensesTitle')).toBeInTheDocument()
  })

  it('renders expense tag chip with the tag name', () => {
    const tags = [makeTag({ id: 'tag-1', name: 'obra' })]
    render(
      <TagsView
        transactions={[makeTx({ tags: ['tag-1'], amount: 300, type: 'EXPENSE' })]}
        tags={tags}
        startDate={APR_START}
        endDate={APR_END}
        includeUnpaid={true}
        shadowClass={SHADOW}
      />
    )
    // Tag chip should show "#obra"
    expect(screen.getAllByText(/#obra/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders income tag section title when income transactions have tags', () => {
    const tags = [makeTag({ id: 'tag-1', name: 'freelance' })]
    render(
      <TagsView
        transactions={[makeTx({ tags: ['tag-1'], amount: 1000, type: 'INCOME' })]}
        tags={tags}
        startDate={APR_START}
        endDate={APR_END}
        includeUnpaid={true}
        shadowClass={SHADOW}
      />
    )
    expect(screen.getByText('analytics.tags.incomeTitle')).toBeInTheDocument()
  })

  it('renders the percentage label for a single tag (100.0%)', () => {
    const tags = [makeTag({ id: 'tag-1', name: 'construção' })]
    render(
      <TagsView
        transactions={[makeTx({ tags: ['tag-1'], amount: 500 })]}
        tags={tags}
        startDate={APR_START}
        endDate={APR_END}
        includeUnpaid={true}
        shadowClass={SHADOW}
      />
    )
    expect(screen.getByText('100.0%')).toBeInTheDocument()
  })

  it('shows both tags when two different tags have transactions', () => {
    const tags = [
      makeTag({ id: 'tag-1', name: 'projeto' }),
      makeTag({ id: 'tag-2', name: 'obra', color: '#22C55E' }),
    ]
    render(
      <TagsView
        transactions={[
          makeTx({ id: 'tx-1', tags: ['tag-1'], amount: 300 }),
          makeTx({ id: 'tx-2', tags: ['tag-2'], amount: 100 }),
        ]}
        tags={tags}
        startDate={APR_START}
        endDate={APR_END}
        includeUnpaid={true}
        shadowClass={SHADOW}
      />
    )
    // Both chip names should appear in the section content
    const chips = screen.getAllByText(/#projeto/i)
    expect(chips.length).toBeGreaterThanOrEqual(1)
    const chips2 = screen.getAllByText(/#obra/i)
    expect(chips2.length).toBeGreaterThanOrEqual(1)
  })

  it('respects includeUnpaid=false — excludes unpaid tagged transactions', () => {
    const tags = [makeTag({ id: 'tag-1', name: 'urgente' })]
    render(
      <TagsView
        transactions={[makeTx({ tags: ['tag-1'], amount: 9999, isPaid: false })]}
        tags={tags}
        startDate={APR_START}
        endDate={APR_END}
        includeUnpaid={false}
        shadowClass={SHADOW}
      />
    )
    expect(screen.getByText('analytics.tags.noData')).toBeInTheDocument()
  })
})

// ─── R-14: Multi-tag OR filter ────────────────────────────────────────────────

describe('TagsView — R-14: OR filter', () => {
  it('shows tag chips in the filter bar', () => {
    const tags = [makeTag({ id: 'tag-1', name: 'construção' })]
    render(
      <TagsView
        transactions={[makeTx({ tags: ['tag-1'] })]}
        tags={tags}
        startDate={APR_START}
        endDate={APR_END}
        includeUnpaid={true}
        shadowClass={SHADOW}
      />
    )
    // Filter bar renders "#construção" chip
    expect(screen.getAllByText(/#construção/i).length).toBeGreaterThanOrEqual(1)
  })

  it('shows "Limpar filtro" button when a tag is selected', () => {
    const tags = [makeTag({ id: 'tag-1', name: 'projeto' })]
    render(
      <TagsView
        transactions={[makeTx({ tags: ['tag-1'] })]}
        tags={tags}
        startDate={APR_START}
        endDate={APR_END}
        includeUnpaid={true}
        shadowClass={SHADOW}
      />
    )

    // Initially no "Limpar filtro" button
    expect(screen.queryByText('analytics.tags.clearFilter')).not.toBeInTheDocument()

    // Click the filter bar chip (first occurrence, which is the filter bar)
    const filterChips = screen.getAllByText(/#projeto/i)
    fireEvent.click(filterChips[0])

    expect(screen.getByText('analytics.tags.clearFilter')).toBeInTheDocument()
  })

  it('clear filter button removes selection and hides itself', () => {
    const tags = [
      makeTag({ id: 'tag-1', name: 'projeto' }),
      makeTag({ id: 'tag-2', name: 'obra', color: '#22C55E' }),
    ]
    render(
      <TagsView
        transactions={[
          makeTx({ id: 'tx-1', tags: ['tag-1'], amount: 100 }),
          makeTx({ id: 'tx-2', tags: ['tag-2'], amount: 200 }),
        ]}
        tags={tags}
        startDate={APR_START}
        endDate={APR_END}
        includeUnpaid={true}
        shadowClass={SHADOW}
      />
    )

    // Select a tag
    fireEvent.click(screen.getAllByText(/#projeto/i)[0])
    expect(screen.getByText('analytics.tags.clearFilter')).toBeInTheDocument()

    // Clear the filter
    fireEvent.click(screen.getByText('analytics.tags.clearFilter'))
    expect(screen.queryByText('analytics.tags.clearFilter')).not.toBeInTheDocument()
  })

  it('OR filter: selecting tag-1 hides section when no transactions match', () => {
    const tags = [
      makeTag({ id: 'tag-1', name: 'projeto' }),
      makeTag({ id: 'tag-2', name: 'obra', color: '#22C55E' }),
    ]
    const transactions = [
      // Only tag-2, none for tag-1
      makeTx({ id: 'tx-1', tags: ['tag-2'], amount: 200 }),
    ]
    render(
      <TagsView
        transactions={transactions}
        tags={tags}
        startDate={APR_START}
        endDate={APR_END}
        includeUnpaid={true}
        shadowClass={SHADOW}
      />
    )

    // Select tag-1 (no matching transactions)
    fireEvent.click(screen.getAllByText(/#projeto/i)[0])

    // No matching transactions → no data message
    expect(screen.getByText('analytics.tags.noData')).toBeInTheDocument()
  })
})

// ─── R-14: Multi-tag OR/AND toggle ───────────────────────────────────────────

describe('TagsView — R-14: OR/AND toggle', () => {
  it('does not show OR/AND toggle when fewer than 2 tags are selected', () => {
    const tags = [makeTag({ id: 'tag-1', name: 'projeto' })]
    render(
      <TagsView
        transactions={[makeTx({ tags: ['tag-1'] })]}
        tags={tags}
        startDate={APR_START}
        endDate={APR_END}
        includeUnpaid={true}
        shadowClass={SHADOW}
      />
    )

    fireEvent.click(screen.getAllByText(/#projeto/i)[0]) // select 1 tag
    expect(screen.queryByText('analytics.tags.orMode')).not.toBeInTheDocument()
    expect(screen.queryByText('analytics.tags.andMode')).not.toBeInTheDocument()
  })

  it('shows OR/AND toggle when 2 or more tags are selected', () => {
    const tags = [
      makeTag({ id: 'tag-1', name: 'projeto' }),
      makeTag({ id: 'tag-2', name: 'obra', color: '#22C55E' }),
    ]
    render(
      <TagsView
        transactions={[makeTx({ id: 'tx-1', tags: ['tag-1', 'tag-2'], amount: 100 })]}
        tags={tags}
        startDate={APR_START}
        endDate={APR_END}
        includeUnpaid={true}
        shadowClass={SHADOW}
      />
    )

    fireEvent.click(screen.getAllByText(/#projeto/i)[0]) // select tag-1
    fireEvent.click(screen.getAllByText(/#obra/i)[0]) // select tag-2

    expect(screen.getByText('analytics.tags.orMode')).toBeInTheDocument()
    expect(screen.getByText('analytics.tags.andMode')).toBeInTheDocument()
  })

  it('AND filter: only shows transactions that have ALL selected tags', () => {
    const tags = [
      makeTag({ id: 'tag-1', name: 'projeto' }),
      makeTag({ id: 'tag-2', name: 'obra', color: '#22C55E' }),
    ]
    const transactions = [
      // tx-1: both tags → should match AND filter
      makeTx({ id: 'tx-1', tags: ['tag-1', 'tag-2'], amount: 200 }),
      // tx-2: only tag-1 → should NOT match AND filter
      makeTx({ id: 'tx-2', tags: ['tag-1'], amount: 9999 }),
    ]
    render(
      <TagsView
        transactions={transactions}
        tags={tags}
        startDate={APR_START}
        endDate={APR_END}
        includeUnpaid={true}
        shadowClass={SHADOW}
      />
    )

    // Select both tags
    fireEvent.click(screen.getAllByText(/#projeto/i)[0])
    fireEvent.click(screen.getAllByText(/#obra/i)[0])

    // Switch to AND mode
    fireEvent.click(screen.getByText('analytics.tags.andMode'))

    // tx-2 amount 9999 should NOT appear (it only has tag-1)
    expect(screen.queryByText(/9\.999/)).not.toBeInTheDocument()
    expect(screen.queryByText(/9999/)).not.toBeInTheDocument()
  })

  it('OR filter (default): shows transactions with at least one selected tag', () => {
    const tags = [
      makeTag({ id: 'tag-1', name: 'projeto' }),
      makeTag({ id: 'tag-2', name: 'obra', color: '#22C55E' }),
    ]
    const transactions = [
      makeTx({ id: 'tx-1', tags: ['tag-1'], amount: 300 }),
      makeTx({ id: 'tx-2', tags: ['tag-2'], amount: 400 }),
    ]
    render(
      <TagsView
        transactions={transactions}
        tags={tags}
        startDate={APR_START}
        endDate={APR_END}
        includeUnpaid={true}
        shadowClass={SHADOW}
      />
    )

    // Select both tags in OR mode (default)
    fireEvent.click(screen.getAllByText(/#projeto/i)[0])
    fireEvent.click(screen.getAllByText(/#obra/i)[0])

    // Both tag chips should appear in the results section (section is still visible)
    expect(screen.getByText('analytics.tags.expensesTitle')).toBeInTheDocument()
  })
})
