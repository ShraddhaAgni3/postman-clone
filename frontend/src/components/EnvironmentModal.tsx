import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { Environment, EnvironmentVariable } from '../types';
import KeyValueTable from './KeyValueTable';

interface EnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiBaseUrl: string;
  onRefreshEnvironments: () => void;
  showToast: (message: string) => void;
}

export const EnvironmentModal: React.FC<EnvironmentModalProps> = ({
  isOpen,
  onClose,
  apiBaseUrl,
  onRefreshEnvironments,
  showToast,
}) => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnv, setSelectedEnv] = useState<Environment | null>(null);
  const [envName, setEnvName] = useState('');
  const [variables, setVariables] = useState<EnvironmentVariable[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchEnvironments();
    }
  }, [isOpen]);

  const fetchEnvironments = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/environments`);
      const data = await res.json();
      setEnvironments(data);
      if (data.length > 0) {
        selectEnvironment(data[0]);
      } else {
        setSelectedEnv(null);
        setEnvName('');
        setVariables([]);
      }
    } catch (e) {
      showToast('Failed to load environments');
    }
  };

  const selectEnvironment = (env: Environment) => {
    setSelectedEnv(env);
    setEnvName(env.name);
    // Convert backend variables to frontend editable format
    setVariables(
      env.variables.map((v) => ({
        key: v.key,
        value: v.value,
        enabled: v.enabled,
      }))
    );
  };

  const handleAddNewEnvironment = () => {
    const newEnv: Environment = {
      id: -Date.now(), // temporary negative ID
      name: 'New Environment',
      variables: [],
    };
    setEnvironments([...environments, newEnv]);
    selectEnvironment(newEnv);
  };

  const handleSaveEnvironment = async () => {
    if (!envName.trim()) {
      showToast('Environment name cannot be empty');
      return;
    }

    setLoading(true);
    // Clean variables: remove empty rows
    const cleanedVars = variables.filter((v) => v.key.trim() !== '');

    const payload = {
      name: envName,
      variables: cleanedVars,
    };

    try {
      let response;
      if (selectedEnv && selectedEnv.id > 0) {
        // Update
        response = await fetch(`${apiBaseUrl}/api/environments/${selectedEnv.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create
        response = await fetch(`${apiBaseUrl}/api/environments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        const savedEnv = await response.json();
        showToast('Environment saved successfully');
        onRefreshEnvironments();
        
        // Reload lists
        const res = await fetch(`${apiBaseUrl}/api/environments`);
        const data = await res.json();
        setEnvironments(data);
        
        // Refocus saved env
        const active = data.find((e: Environment) => e.name === savedEnv.name) || data[0];
        if (active) selectEnvironment(active);
      } else {
        showToast('Failed to save environment');
      }
    } catch (err) {
      showToast('Error saving environment');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEnvironment = async (env: Environment) => {
    if (env.id < 0) {
      // Remove temporary environment
      const filtered = environments.filter((e) => e.id !== env.id);
      setEnvironments(filtered);
      if (filtered.length > 0) selectEnvironment(filtered[0]);
      else {
        setSelectedEnv(null);
        setEnvName('');
        setVariables([]);
      }
      return;
    }

    if (!confirm(`Are you sure you want to delete "${env.name}"?`)) return;

    try {
      const res = await fetch(`${apiBaseUrl}/api/environments/${env.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Environment deleted');
        onRefreshEnvironments();
        fetchEnvironments();
      } else {
        showToast('Failed to delete environment');
      }
    } catch (e) {
      showToast('Error deleting environment');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ height: '70vh' }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Manage Environments
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', padding: 0, overflow: 'hidden' }}>
          {/* Left panel: List environments */}
          <div
            style={{
              width: '240px',
              borderRight: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-primary)',
            }}
          >
            <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>
              <button
                onClick={handleAddNewEnvironment}
                className="btn-secondary"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  padding: '6px 12px',
                }}
              >
                <Plus size={14} /> Add Environment
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {environments.map((env) => (
                <div
                  key={env.id}
                  onClick={() => selectEnvironment(env)}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: selectedEnv?.id === env.id ? 'var(--bg-tertiary)' : 'transparent',
                    borderLeft: selectedEnv?.id === env.id ? '3px solid var(--bg-accent)' : '3px solid transparent',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {env.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEnvironment(env);
                    }}
                    style={{ color: 'var(--text-muted)', opacity: selectedEnv?.id === env.id ? 1 : 0 }}
                    className="kv-delete-btn"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {environments.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No environments configured.
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Edit selected environment */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px' }}>
            {selectedEnv ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                    }}
                  >
                    Environment Name
                  </label>
                  <input
                    type="text"
                    value={envName}
                    onChange={(e) => setEnvName(e.target.value)}
                    placeholder="Environment Name"
                    style={{
                      width: '100%',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '8px 12px',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                    }}
                  >
                    Variables
                  </label>
                  <KeyValueTable
                    items={variables.map((v) => ({ ...v, type: 'text' }))}
                    onChange={(updatedItems) => {
                      setVariables(
                        updatedItems.map((item) => ({
                          key: item.key,
                          value: item.value,
                          enabled: item.enabled,
                        }))
                      );
                    }}
                    keyPlaceholder="Variable"
                    valuePlaceholder="Current Value"
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: '16px',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '12px',
                  }}
                >
                  <button
                    onClick={handleSaveEnvironment}
                    disabled={loading}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', fontSize: '13px' }}
                  >
                    <Save size={14} /> {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                }}
              >
                Select an environment from the list or create a new one.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default EnvironmentModal;
