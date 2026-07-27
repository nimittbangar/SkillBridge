// Tiny CSV export helper — no new dependency needed.
// Converts an array of flat objects into a downloadable CSV file.
export function exportToCsv(filename, rows, columns) {
  if (!rows || rows.length === 0) return

  const escapeCell = (value) => {
    const str = value === null || value === undefined ? '' : String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"'
    }
    return str
  }

  const headers = columns.map(c => c.label)
  const lines = [headers.join(',')]

  rows.forEach(row => {
    const line = columns.map(c => escapeCell(c.accessor(row)))
    lines.push(line.join(','))
  })

  const csvContent = lines.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}