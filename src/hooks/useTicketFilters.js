import { useSearchParams } from 'react-router-dom'

// URL-synced filter state shared by the dashboard and every channel tab, so a filtered
// view is shareable/bookmarkable and the search/filter logic lives in exactly one place.
export function useTicketFilters(fixedChannel) {
  const [params, setParams] = useSearchParams()

  const filters = {
    q: params.get('q') || '',
    status: params.get('status') || '',
    priority: params.get('priority') || '',
    channel: fixedChannel || params.get('channel') || '',
    assigned: params.get('assigned') || '',
    from: params.get('from') || '',
    to: params.get('to') || '',
    mine: params.get('mine') === '1',
  }

  function setFilter(key, value) {
    const next = new URLSearchParams(params)
    if (!value) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  function toggleMine() {
    setFilter('mine', filters.mine ? '' : '1')
  }

  return { filters, setFilter, toggleMine }
}
