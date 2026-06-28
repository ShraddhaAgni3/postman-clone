import React, { useState, useEffect } from 'react';
import { Send, Save, AlertCircle } from 'lucide-react';
import { Tab, KeyValueItem, AuthConfig, EnvironmentVariable, CollectionDetail } from '../types';
import KeyValueTable from './KeyValueTable';
import { resolveVariablesString } from '../utils/variableResolver';

interface RequestBuilderProps {
  tab: Tab;
  activeVariables: EnvironmentVariable[];
  collections: CollectionDetail[];
  onUpdateTab: (updatedTab: Partial<Tab>) => void;
  onSend: () => void;
  onSave: (name: string, collectionId: number) => void;
}

export const RequestBuilder: React.FC<RequestBuilderProps> = ({
  tab,
  activeVariables,
  collections,
  onUpdateTab,
  onSend,
  onSave,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'params' | 'auth' | 'headers' | 'body'>('params');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState(tab.name);
  const [saveCollectionId, setSaveCollectionId] = useState<number | ''>('');

  useEffect(() => {
    setSaveName(tab.name);
  }, [tab.name, tab.id]);

  // Synchronize URL query params -> Params table (only when URL is typed directly)
  const handleUrlChange = (newUrl: string) => {
    onUpdateTab({ url: newUrl });

    // Sync to params
    const queryIndex = newUrl.indexOf('?');
    if (queryIndex !== -1) {
      const queryString = newUrl.substring(queryIndex + 1);
      const pairs = queryString.split('&');
      const parsedParams: KeyValueItem[] = pairs
        .map((pair) => {
          const eqIndex = pair.indexOf('=');
          if (eqIndex === -1) return { key: pair, value: '', enabled: true };
          return {
            key: pair.substring(0, eqIndex),
            value: pair.substring(eqIndex + 1),
            enabled: true,
          };
        })
        .filter((item) => item.key !== '');
      
      // Merge with existing params that might not be enabled
      onUpdateTab({ params: parsedParams, isDirty: true });
    } else {
      // Clear params if URL has no query string
      if (tab.params.some(p => p.key !== '')) {
        onUpdateTab({ params: [], isDirty: true });
      }
    }
  };

  // Synchronize Params table -> URL query string
  const handleParamsChange = (updatedParams: KeyValueItem[]) => {
    onUpdateTab({ params: updatedParams, isDirty: true });

    // Rebuild URL
    const baseUrl = tab.url.split('?')[0] || '';
    const activeParams = updatedParams.filter((p) => p.enabled && p.key.trim() !== '');
    
    if (activeParams.length > 0) {
      const queryStr = activeParams.map((p) => `${p.key}=${p.value}`).join('&');
      onUpdateTab({ url: `${baseUrl}?${queryStr}`, params: updatedParams });
    } else {
      onUpdateTab({ url: baseUrl, params: updatedParams });
    }
  };

  const handleMethodChange = (method: string) => {
    onUpdateTab({ method, isDirty: true });
  };

  const handleHeadersChange = (updatedHeaders: KeyValueItem[]) => {
    onUpdateTab({ headers: updatedHeaders, isDirty: true });
  };

  const handleBodyTypeChange = (body_type: string) => {
    onUpdateTab({ body_type, isDirty: true });
  };

  const handleRawBodyChange = (body_raw: string) => {
    onUpdateTab({ body_raw, isDirty: true });
  };

  const handleRawBodyTypeChange = (body_raw_type: string) => {
    onUpdateTab({ body_raw_type, isDirty: true });
  };

  const handleFormDataChange = (updatedFormData: KeyValueItem[]) => {
    onUpdateTab({ body_form_data: updatedFormData, isDirty: true });
  };

  const handleUrlEncodedChange = (updatedUrlEncoded: KeyValueItem[]) => {
    onUpdateTab({ body_urlencoded: updatedUrlEncoded, isDirty: true });
  };

  const handleAuthTypeChange = (auth_type: string) => {
    onUpdateTab({ auth_type, isDirty: true });
  };

  const handleAuthConfigChange = (field: keyof AuthConfig, value: string) => {
    const currentConfig = tab.auth_config || {};
    onUpdateTab({
      auth_config: { ...currentConfig, [field]: value },
      isDirty: true,
    });
  };

  const triggerSaveRequest = () => {
    if (tab.type === 'saved' && tab.savedRequestId) {
      // Direct save if already saved in DB
      onSave(tab.name, tab.savedRequestId);
    } else {
      // Show collection save modal
      if (collections.length > 0) {
        setSaveCollectionId(collections[0].id);
      }
      setShowSaveModal(true);
    }
  };

  const confirmSaveRequest = () => {
    if (!saveName.trim()) return;
    if (saveCollectionId === '') return;
    onSave(saveName, Number(saveCollectionId));
    setShowSaveModal(false);
  };

  const getResolvedUrlPreview = () => {
    return resolveVariablesString(tab.url, activeVariables);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-primary)',
        gap: '12px',
      }}
    >
      {/* Top Bar: Method Selector + URL input + Send + Save */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <select
          value={tab.method}
          onChange={(e) => handleMethodChange(e.target.value)}
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRight: 'none',
            borderRadius: '4px 0 0 4px',
            color: 'var(--text-primary)',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
          <option value="HEAD">HEAD</option>
          <option value="OPTIONS">OPTIONS</option>
        </select>

        <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
          <input
            type="text"
            value={tab.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="Enter request URL (e.g. {{baseUrl}}/posts)"
            style={{
              flex: 1,
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '0 4px 4px 0',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 500,
            }}
          />
        </div>

        <button
          onClick={onSend}
          disabled={tab.loading}
          className="btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 20px',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          <Send size={14} /> Send
        </button>

        <button
          onClick={triggerSaveRequest}
          className="btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <Save size={14} /> Save
        </button>
      </div>

      {/* URL Variable preview helper */}
      {tab.url && tab.url.includes('{{') && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            background: 'var(--bg-secondary)',
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px dashed var(--border-color)',
          }}
        >
          <AlertCircle size={12} style={{ color: 'var(--bg-accent)' }} />
          <span>Resolved URL Preview:</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-get)', wordBreak: 'break-all' }}>
            {getResolvedUrlPreview()}
          </span>
        </div>
      )}

      {/* Editor Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginTop: '8px' }}>
        <button
          onClick={() => setActiveSubTab('params')}
          style={{
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 500,
            color: activeSubTab === 'params' ? 'var(--bg-accent)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'params' ? '2px solid var(--bg-accent)' : '2px solid transparent',
          }}
        >
          Params
        </button>
        <button
          onClick={() => setActiveSubTab('auth')}
          style={{
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 500,
            color: activeSubTab === 'auth' ? 'var(--bg-accent)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'auth' ? '2px solid var(--bg-accent)' : '2px solid transparent',
          }}
        >
          Authorization
        </button>
        <button
          onClick={() => setActiveSubTab('headers')}
          style={{
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 500,
            color: activeSubTab === 'headers' ? 'var(--bg-accent)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'headers' ? '2px solid var(--bg-accent)' : '2px solid transparent',
          }}
        >
          Headers
        </button>
        <button
          onClick={() => setActiveSubTab('body')}
          style={{
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 500,
            color: activeSubTab === 'body' ? 'var(--bg-accent)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'body' ? '2px solid var(--bg-accent)' : '2px solid transparent',
          }}
        >
          Body
        </button>
      </div>

      {/* Tab Panels */}
      <div style={{ padding: '8px 0', minHeight: '160px', overflowY: 'auto' }}>
        {activeSubTab === 'params' && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Query Parameters (Automatically synchronized with URL string)
            </div>
            <KeyValueTable
              items={tab.params}
              onChange={handleParamsChange}
              keyPlaceholder="Parameter"
              valuePlaceholder="Value"
            />
          </div>
        )}

        {activeSubTab === 'auth' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '12px', width: '80px', color: 'var(--text-secondary)' }}>Type</span>
              <select
                value={tab.auth_type}
                onChange={(e) => handleAuthTypeChange(e.target.value)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  flex: 1,
                }}
              >
                <option value="none">No Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
              </select>
            </div>

            {tab.auth_type === 'bearer' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', width: '80px', color: 'var(--text-secondary)' }}>Token</span>
                <input
                  type="text"
                  placeholder="Bearer token value"
                  value={tab.auth_config?.token || ''}
                  onChange={(e) => handleAuthConfigChange('token', e.target.value)}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    flex: 1,
                  }}
                />
              </div>
            )}

            {tab.auth_type === 'basic' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', width: '80px', color: 'var(--text-secondary)' }}>Username</span>
                  <input
                    type="text"
                    placeholder="Username"
                    value={tab.auth_config?.username || ''}
                    onChange={(e) => handleAuthConfigChange('username', e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      flex: 1,
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', width: '80px', color: 'var(--text-secondary)' }}>Password</span>
                  <input
                    type="password"
                    placeholder="Password"
                    value={tab.auth_config?.password || ''}
                    onChange={(e) => handleAuthConfigChange('password', e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      flex: 1,
                    }}
                  />
                </div>
              </div>
            )}

            {tab.auth_type === 'none' && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                This request does not use authorization headers.
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'headers' && (
          <KeyValueTable
            items={tab.headers}
            onChange={handleHeadersChange}
            keyPlaceholder="Header Name"
            valuePlaceholder="Value"
          />
        )}

        {activeSubTab === 'body' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="body_type"
                  checked={tab.body_type === 'none'}
                  onChange={() => handleBodyTypeChange('none')}
                  className="kv-checkbox"
                />
                none
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="body_type"
                  checked={tab.body_type === 'form-data'}
                  onChange={() => handleBodyTypeChange('form-data')}
                  className="kv-checkbox"
                />
                form-data
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="body_type"
                  checked={tab.body_type === 'x-www-form-urlencoded'}
                  onChange={() => handleBodyTypeChange('x-www-form-urlencoded')}
                  className="kv-checkbox"
                />
                x-www-form-urlencoded
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="body_type"
                  checked={tab.body_type === 'raw'}
                  onChange={() => handleBodyTypeChange('raw')}
                  className="kv-checkbox"
                />
                raw
              </label>

              {tab.body_type === 'raw' && (
                <select
                  value={tab.body_raw_type || 'JSON'}
                  onChange={(e) => handleRawBodyTypeChange(e.target.value)}
                  style={{
                    marginLeft: 'auto',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '11px',
                  }}
                >
                  <option value="JSON">JSON</option>
                  <option value="Text">Text</option>
                  <option value="XML">XML</option>
                  <option value="HTML">HTML</option>
                </select>
              )}
            </div>

            <div style={{ flex: 1 }}>
              {tab.body_type === 'none' && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '12px 0' }}>
                  This request does not send a body payload.
                </div>
              )}

              {tab.body_type === 'raw' && (
                <textarea
                  placeholder="Raw Request Body Payload (e.g. JSON object)"
                  value={tab.body_raw || ''}
                  onChange={(e) => handleRawBodyChange(e.target.value)}
                  style={{
                    width: '100%',
                    height: '180px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: '#e3e3e3',
                    padding: '12px',
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />
              )}

              {tab.body_type === 'form-data' && (
                <KeyValueTable
                  items={tab.body_form_data || []}
                  onChange={handleFormDataChange}
                  keyPlaceholder="Field Name"
                  valuePlaceholder="Value"
                />
              )}

              {tab.body_type === 'x-www-form-urlencoded' && (
                <KeyValueTable
                  items={tab.body_urlencoded || []}
                  onChange={handleUrlEncodedChange}
                  keyPlaceholder="Field Name"
                  valuePlaceholder="Value"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save Request Collection Modal */}
      {showSaveModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3>Save Request</h3>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Request Name
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Request Name"
                  style={{
                    width: '100%',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Save to Collection
                </label>
                {collections.length > 0 ? (
                  <select
                    value={saveCollectionId}
                    onChange={(e) => setSaveCollectionId(Number(e.target.value))}
                    style={{
                      width: '100%',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '8px 12px',
                      fontSize: '13px',
                    }}
                  >
                    {collections.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: '12px', color: '#ef4444' }}>
                    No collections found. Create a collection in the left sidebar first.
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowSaveModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={confirmSaveRequest}
                disabled={saveCollectionId === ''}
                className="btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default RequestBuilder;
