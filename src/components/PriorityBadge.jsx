export default function PriorityBadge({ priority }) {
  if (!priority) return null
  return <span className={`badge badge-priority-${priority}`}>{priority}</span>
}
