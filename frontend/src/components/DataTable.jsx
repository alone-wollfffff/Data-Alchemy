import { motion } from 'framer-motion'

export default function DataTable({ preview, maxHeight = 300 }) {
  if (!preview) return null
  const { columns, rows, dtypes, shape } = preview

  return (
    <div>
      <div className="flex-between mb-16">
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
          Showing first {rows.length} of{' '}
          <span className="text-cyan" style={{ fontFamily: 'var(--font-mono)' }}>{shape.rows.toLocaleString()}</span> rows
          ×{' '}
          <span className="text-cyan" style={{ fontFamily: 'var(--font-mono)' }}>{shape.cols}</span> columns
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="badge badge-cyan">{shape.rows.toLocaleString()} rows</span>
          <span className="badge badge-muted">{shape.cols} cols</span>
        </div>
      </div>
      <div className="data-table-wrapper" style={{ maxHeight }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} title={dtypes?.[col]}>
                  {col}
                  {dtypes?.[col] && (
                    <span style={{ marginLeft: 4, fontSize: 9, color: 'var(--text-3)', fontWeight: 400 }}>
                      {dtypes[col].replace('object', 'str').replace('float64', 'f64').replace('int64', 'i64')}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <motion.tr
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
              >
                {row.map((cell, j) => (
                  <td key={j} title={cell}>
                    {cell === '' || cell === 'nan' ? (
                      <span style={{ color: 'var(--red)', fontSize: 10 }}>NULL</span>
                    ) : cell}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
