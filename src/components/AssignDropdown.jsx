import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

export default function AssignDropdown({ ticket, staffOptions, onAssigned }) {
  const { staff, isManagement } = useAuth()

  async function handleChange(e) {
    e.stopPropagation()
    const newStaffId = e.target.value || null
    if (newStaffId === (ticket.assigned_staff_id || null)) return

    const prev = ticket.assigned_staff
    const next = newStaffId ? staffOptions.find(s => s.id === newStaffId) : null

    const { error } = await supabase.from('support_tickets').update({ assigned_staff_id: newStaffId }).eq('id', ticket.id)
    if (error) { alert(error.message); return }

    const fromLabel = prev ? `${prev.first_name} ${prev.last_name}` : 'Unassigned'
    const toLabel = next ? `${next.first_name} ${next.last_name}` : 'Unassigned'
    await supabase.from('ticket_messages').insert({
      ticket_id: ticket.id,
      sender_type: 'system',
      body: `${staff?.first_name || 'A staff member'} reassigned this ticket from ${fromLabel} to ${toLabel}.`,
    })
    onAssigned?.()
  }

  return (
    <select
      className="assign-select"
      value={ticket.assigned_staff_id || ''}
      onChange={handleChange}
      onClick={e => e.stopPropagation()}
      disabled={!isManagement}
      title={isManagement ? '' : 'Only management can reassign tickets'}
    >
      <option value="">Unassigned</option>
      {staffOptions.map(s => (
        <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
      ))}
    </select>
  )
}
