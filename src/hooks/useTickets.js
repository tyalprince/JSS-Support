import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const TICKET_SELECT = '*, families(primary_parent_first, primary_parent_last), assigned_staff:staff!assigned_staff_id(id, first_name, last_name)'

// Shared data-fetching for the dashboard and every channel tab — filters combine with AND.
export function useTickets(filters, currentStaffId) {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('support_tickets').select(TICKET_SELECT)

    if (filters.channel) query = query.eq('channel', filters.channel)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.priority) query = query.eq('priority', filters.priority)
    if (filters.mine && currentStaffId) query = query.eq('assigned_staff_id', currentStaffId)
    else if (filters.assigned) query = query.eq('assigned_staff_id', filters.assigned)
    if (filters.from) query = query.gte('created_at', filters.from)
    if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59`)
    if (filters.q) {
      const q = filters.q.replace(/[%,]/g, '')
      query = query.or(`subject.ilike.%${q}%,body.ilike.%${q}%`)
    }

    query = query.order('due_at', { ascending: true, nullsFirst: false })

    const { data, error } = await query
    if (error) setError(error.message)
    else { setError(''); setTickets(data || []) }
    setLoading(false)
  }, [JSON.stringify(filters), currentStaffId])

  useEffect(() => { load() }, [load])

  return { tickets, loading, error, reload: load }
}

export function useActiveStaff() {
  const [staff, setStaff] = useState([])
  useEffect(() => {
    supabase.from('staff').select('id, first_name, last_name').eq('active', true).order('first_name')
      .then(({ data }) => setStaff(data || []))
  }, [])
  return staff
}
