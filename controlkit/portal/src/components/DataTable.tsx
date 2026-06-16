import { type ReactNode } from 'react';

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  width?: string;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  emptyText?: string;
  keyFn: (row: T) => string;
}

export default function DataTable<T>({ rows, columns, emptyText = 'No data', keyFn }: Props<T>) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((c, i) => (
            <th key={i} style={c.width ? { width: c.width } : undefined}>{c.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="empty">{emptyText}</td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={keyFn(row)}>
              {columns.map((c, i) => (
                <td key={i}>{c.render(row)}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
