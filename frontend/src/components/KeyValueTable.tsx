import React from 'react';
import { Trash2 } from 'lucide-react';
import { KeyValueItem } from '../types';

interface KeyValueTableProps {
  items: KeyValueItem[];
  onChange: (updatedItems: KeyValueItem[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export const KeyValueTable: React.FC<KeyValueTableProps> = ({
  items,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}) => {
  // Ensure we always have at least one blank row at the end to allow entry
  const tableItems = [...items];
  const hasEmptyLastRow =
    tableItems.length > 0 &&
    tableItems[tableItems.length - 1].key === '' &&
    tableItems[tableItems.length - 1].value === '';

  if (tableItems.length === 0 || !hasEmptyLastRow) {
    tableItems.push({ key: '', value: '', enabled: true });
  }

  const handleRowChange = (index: number, field: keyof KeyValueItem, value: any) => {
    const updated = tableItems.map((item, idx) => {
      if (idx === index) {
        const newItem = { ...item, [field]: value };
        // If the user starts typing in a new row, enable it automatically
        if (field === 'key' || field === 'value') {
          newItem.enabled = true;
        }
        return newItem;
      }
      return item;
    });

    // Remove last row if it becomes empty and isn't the only row
    const cleaned = updated.filter((item, idx) => {
      // Don't filter out the editing row if it's the last row
      if (idx === updated.length - 1) return true;
      // Keep if not empty
      return item.key !== '' || item.value !== '';
    });

    onChange(cleaned);
  };

  const handleDeleteRow = (index: number) => {
    const updated = tableItems.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  return (
    <table className="kv-table">
      <thead>
        <tr>
          <th style={{ width: '40px', textAlign: 'center' }}></th>
          <th>Key</th>
          <th>Value</th>
          <th style={{ width: '50px' }}></th>
        </tr>
      </thead>
      <tbody>
        {tableItems.map((item, idx) => (
          <tr key={idx}>
            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
              <input
                type="checkbox"
                className="kv-checkbox"
                checked={item.enabled}
                disabled={item.key === '' && item.value === ''}
                onChange={(e) => handleRowChange(idx, 'enabled', e.target.checked)}
              />
            </td>
            <td>
              <input
                type="text"
                className="kv-input"
                placeholder={keyPlaceholder}
                value={item.key}
                onChange={(e) => handleRowChange(idx, 'key', e.target.value)}
              />
            </td>
            <td>
              <input
                type="text"
                className="kv-input"
                placeholder={valuePlaceholder}
                value={item.value}
                onChange={(e) => handleRowChange(idx, 'value', e.target.value)}
              />
            </td>
            <td style={{ textAlign: 'center' }}>
              {!(item.key === '' && item.value === '') && (
                <button
                  type="button"
                  className="kv-delete-btn"
                  onClick={() => handleDeleteRow(idx)}
                  title="Delete row"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
export default KeyValueTable;
