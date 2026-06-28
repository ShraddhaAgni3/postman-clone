import React, { useState } from 'react';
import {
  Folder,
  FolderPlus,
  Plus,
  Trash2,
  Edit,
  ChevronRight,
  ChevronDown,
  History,
  FileCode,
  Settings,
  Search,
  PlusCircle,
  Database
} from 'lucide-react';
import { CollectionDetail, RequestType, HistoryItem, Environment } from '../types';

interface SidebarProps {
  collections: CollectionDetail[];
  history: HistoryItem[];
  environments: Environment[];
  selectedEnvId: number | null;
  apiBaseUrl: string;
  onRefreshCollections: () => void;
  onRefreshHistory: () => void;
  onSelectRequest: (req: RequestType) => void;
  onSelectHistory: (item: HistoryItem) => void;
  onSelectEnvironment: (id: number | null) => void;
  onOpenEnvModal: () => void;
  showToast: (msg: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collections,
  history,
  environments,
  selectedEnvId,
  apiBaseUrl,
  onRefreshCollections,
  onRefreshHistory,
  onSelectRequest,
  onSelectHistory,
  onSelectEnvironment,
  onOpenEnvModal,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'collections' | 'history' | 'environments'>('collections');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCollections, setExpandedCollections] = useState<Record<number, boolean>>({});

  // CRUD modals state
  const [showColModal, setShowColModal] = useState(false);
  const [colModalMode, setColModalMode] = useState<'create' | 'rename'>('create');
  const [colModalName, setColModalName] = useState('');
  const [selectedColId, setSelectedColId] = useState<number | null>(null);

  const toggleCollection = (id: number) => {
    setExpandedCollections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCreateCollection = async () => {
    if (!colModalName.trim()) return;
    try {
      let res;
      if (colModalMode === 'create') {
        res = await fetch(`${apiBaseUrl}/api/collections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: colModalName }),
        });
      } else {
        res = await fetch(`${apiBaseUrl}/api/collections/${selectedColId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: colModalName }),
        });
      }

      if (res.ok) {
        showToast(colModalMode === 'create' ? 'Collection created' : 'Collection renamed');
        onRefreshCollections();
        setColModalName('');
        setShowColModal(false);
      } else {
        showToast('Operation failed');
      }
    } catch (e) {
      showToast('Error communicating with backend');
    }
  };

  const handleDeleteCollection = async (id: number, name: string) => {
    if (!confirm(`Delete collection "${name}" and all saved requests inside?`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/collections/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Collection deleted');
        onRefreshCollections();
      } else {
        showToast('Delete failed');
      }
    } catch (e) {
      showToast('Error deleting collection');
    }
  };

  const handleAddNewRequest = async (collectionId: number) => {
    const reqName = prompt('Enter request name:', 'New Request');
    if (!reqName) return;

    try {
      const res = await fetch(`${apiBaseUrl}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection_id: collectionId,
          name: reqName,
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/posts',
          headers: [],
          params: [],
          body_type: 'none',
          auth_type: 'none',
        }),
      });

      if (res.ok) {
        showToast('Request created');
        onRefreshCollections();
        // Automatically expand
        setExpandedCollections((prev) => ({ ...prev, [collectionId]: true }));
      } else {
        showToast('Failed to create request');
      }
    } catch (e) {
      showToast('Error creating request');
    }
  };

  const handleDeleteRequest = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this saved request?')) return;

    try {
      const res = await fetch(`${apiBaseUrl}/api/requests/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Request deleted');
        onRefreshCollections();
      } else {
        showToast('Failed to delete request');
      }
    } catch (err) {
      showToast('Error deleting request');
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear all history?')) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/history`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('History cleared');
        onRefreshHistory();
      } else {
        showToast('Failed to clear history');
      }
    } catch (e) {
      showToast('Error clearing history');
    }
  };

  const getMethodBadgeClass = (method: string) => {
    const m = method.toLowerCase();
    if (m === 'get') return 'method-get';
    if (m === 'post') return 'method-post';
    if (m === 'put') return 'method-put';
    if (m === 'delete') return 'method-delete';
    if (m === 'patch') return 'method-patch';
    return 'method-head';
  };

  const filteredCollections = collections.filter((c) => {
    const nameMatch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const reqMatch = c.requests.some((r) => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return nameMatch || reqMatch;
  });

  const filteredHistory = history.filter((h) =>
    h.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.method.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="sidebar">
      {/* Sidebar Nav Tabs */}
      <div className="sidebar-tabs">
        <button
          onClick={() => {
            setActiveTab('collections');
            setSearchTerm('');
          }}
          className={`sidebar-tab-btn ${activeTab === 'collections' ? 'active' : ''}`}
        >
          <Folder size={14} /> Collections
        </button>
        <button
          onClick={() => {
            setActiveTab('history');
            setSearchTerm('');
          }}
          className={`sidebar-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
        >
          <History size={14} /> History
        </button>
        <button
          onClick={() => {
            setActiveTab('environments');
            setSearchTerm('');
          }}
          className={`sidebar-tab-btn ${activeTab === 'environments' ? 'active' : ''}`}
        >
          <Database size={14} /> Environments
        </button>
      </div>

      {/* Search and Action area */}
      <div className="sidebar-search-container">
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={14} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="sidebar-search-input"
            placeholder={
              activeTab === 'collections'
                ? 'Filter collections...'
                : activeTab === 'history'
                ? 'Filter history...'
                : 'Filter environments...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '28px' }}
          />
        </div>
        {activeTab === 'collections' && (
          <button
            onClick={() => {
              setColModalMode('create');
              setColModalName('');
              setShowColModal(true);
            }}
            className="sidebar-action-btn"
            title="Create Collection"
          >
            <FolderPlus size={14} />
          </button>
        )}
      </div>

      {/* Core Lists */}
      <div className="sidebar-content">
        {/* Collections Tab */}
        {activeTab === 'collections' && (
          <div style={{ padding: '0 8px' }}>
            {filteredCollections.map((col) => (
              <div key={col.id} style={{ marginBottom: '4px' }}>
                {/* Collection Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                  className="sidebar-item-row"
                  onClick={() => toggleCollection(col.id)}
                >
                  <span style={{ marginRight: '6px', color: 'var(--text-muted)', display: 'flex' }}>
                    {expandedCollections[col.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                  <Folder size={14} style={{ marginRight: '8px', color: 'var(--bg-accent)' }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {col.name}
                  </span>
                  
                  {/* Hover collection controls */}
                  <div className="hover-actions-panel" style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddNewRequest(col.id);
                      }}
                      className="kv-delete-btn"
                      style={{ padding: '2px' }}
                      title="Add Request"
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedColId(col.id);
                        setColModalName(col.name);
                        setColModalMode('rename');
                        setShowColModal(true);
                      }}
                      className="kv-delete-btn"
                      style={{ padding: '2px' }}
                      title="Rename"
                    >
                      <Edit size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCollection(col.id, col.name);
                      }}
                      className="kv-delete-btn"
                      style={{ padding: '2px' }}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Requests list inside collection */}
                {expandedCollections[col.id] && (
                  <div style={{ paddingLeft: '24px', marginTop: '2px' }}>
                    {col.requests
                      .filter((r) => r.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((req) => (
                        <div
                          key={req.id}
                          onClick={() => onSelectRequest(req)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '5px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            marginBottom: '1px',
                          }}
                          className="sidebar-item-row"
                        >
                          <span className={`method-badge ${getMethodBadgeClass(req.method)}`} style={{ minWidth: '40px', fontSize: '9px', padding: '1px 4px', marginRight: '8px' }}>
                            {req.method}
                          </span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                            {req.name}
                          </span>
                          <button
                            onClick={(e) => handleDeleteRequest(req.id, e)}
                            className="hover-actions-panel kv-delete-btn"
                            style={{ padding: '2px', marginLeft: '4px' }}
                            title="Delete Request"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    {col.requests.length === 0 && (
                      <div style={{ padding: '6px 12px', fontStyle: 'italic', fontSize: '11px', color: 'var(--text-muted)' }}>
                        Empty collection. Click + to add request.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {collections.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                No collections. Add one above!
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div style={{ padding: '0 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px 8px 8px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Execution Logs</span>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  style={{ fontSize: '11px', color: 'var(--color-delete)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                >
                  Clear All
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectHistory(item)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                  className="sidebar-item-row"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className={`method-badge ${getMethodBadgeClass(item.method)}`} style={{ minWidth: '40px', fontSize: '9px', padding: '1px 4px' }}>
                      {item.method}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: item.response_status >= 200 && item.response_status < 300 ? 'var(--color-get)' : 'var(--color-delete)',
                      }}
                    >
                      {item.response_status}
                    </span>
                  </div>
                  <span
                    style={{
                      marginTop: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {item.url}
                  </span>
                </div>
              ))}
              {history.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No requests sent yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Environments Tab */}
        {activeTab === 'environments' && (
          <div style={{ padding: '0 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px 8px 8px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Environments Profiles</span>
              <button
                onClick={onOpenEnvModal}
                style={{ fontSize: '11px', color: 'var(--bg-accent)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
              >
                <Settings size={11} /> Manage
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {/* Default No Environment Option */}
              <div
                onClick={() => onSelectEnvironment(null)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  background: selectedEnvId === null ? 'var(--bg-tertiary)' : 'transparent',
                  borderLeft: selectedEnvId === null ? '3px solid var(--bg-accent)' : '3px solid transparent',
                  color: selectedEnvId === null ? '#fff' : 'var(--text-secondary)',
                }}
              >
                No Environment
              </div>

              {environments
                .filter((env) => env.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((env) => (
                  <div
                    key={env.id}
                    onClick={() => onSelectEnvironment(env.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      background: selectedEnvId === env.id ? 'var(--bg-tertiary)' : 'transparent',
                      borderLeft: selectedEnvId === env.id ? '3px solid var(--bg-accent)' : '3px solid transparent',
                      color: selectedEnvId === env.id ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    {env.name}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Save / Rename Collection Modal */}
      {showColModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>{colModalMode === 'create' ? 'Create Collection' : 'Rename Collection'}</h3>
            </div>
            <div className="modal-body">
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Collection Name
              </label>
              <input
                type="text"
                value={colModalName}
                onChange={(e) => setColModalName(e.target.value)}
                placeholder="Sandbox, REST tests, etc."
                style={{
                  width: '100%',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  fontSize: '13px',
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
              />
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowColModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={!colModalName.trim()}
                className="btn-primary"
              >
                {colModalMode === 'create' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Row Hover Actions style sheet Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        .sidebar-item-row {
          position: relative;
          transition: background-color 0.15s;
        }
        .sidebar-item-row:hover {
          background-color: var(--bg-tertiary);
        }
        .hover-actions-panel {
          display: none !important;
          position: absolute;
          right: 6px;
          background: var(--bg-tertiary);
          padding-left: 6px;
          border-radius: 4px;
        }
        .sidebar-item-row:hover .hover-actions-panel {
          display: flex !important;
        }
      `}} />
    </div>
  );
};
export default Sidebar;
