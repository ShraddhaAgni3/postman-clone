'use client';

import React, { useState, useEffect } from 'react';
import { Plus, X, Laptop, Users, Share2, Layers, Cpu, Award, Settings, Menu } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import RequestBuilder from '../components/RequestBuilder';
import ResponseViewer from '../components/ResponseViewer';
import EnvironmentModal from '../components/EnvironmentModal';
import { Tab, CollectionDetail, HistoryItem, Environment, RequestType, ResponseData, KeyValueItem } from '../types';

const API_BASE_URL = 'https://postman-clone-m4pd.onrender.com';

export default function WorkspacePage() {
  // Collections, History, and Environments from API
  const [collections, setCollections] = useState<CollectionDetail[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);

  // Selected states
  const [selectedEnvId, setSelectedEnvId] = useState<number | null>(null);
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);

  // Workspace Tabs State
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');

  // Toast state
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);

  // Mobile responsiveness
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Placeholder states
  const [placeholderText, setPlaceholderText] = useState<string | null>(null);

  // Initialize data on load
  useEffect(() => {
    fetchCollections();
    fetchHistory();
    fetchEnvironments();
  }, []);

  // Initialize first tab if none exist
  useEffect(() => {
    if (tabs.length === 0) {
      handleAddNewTab();
    }
  }, [tabs]);

  const showToast = (message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const fetchCollections = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/collections`);
      if (res.ok) {
        const data = await res.json();
        setCollections(data);
      }
    } catch (e) {
      showToast('Backend offline - could not load collections');
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      // Offline fallback
    }
  };

  const fetchEnvironments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/environments`);
      if (res.ok) {
        const data = await res.json();
        setEnvironments(data);
      }
    } catch (e) {
      // Offline fallback
    }
  };

  // Manage open tabs
  const handleAddNewTab = () => {
    const newTabId = `tab_${Date.now()}`;
    const newTab: Tab = {
      id: newTabId,
      name: 'Untitled Request',
      type: 'new',
      method: 'GET',
      url: '',
      headers: [],
      params: [],
      body_type: 'none',
      body_raw: '',
      body_raw_type: 'JSON',
      body_form_data: [],
      body_urlencoded: [],
      auth_type: 'none',
      auth_config: {},
      isDirty: false,
      response: null,
      loading: false,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedTabs = tabs.filter((t) => t.id !== id);
    setTabs(updatedTabs);

    // If active tab closed, point to another active one
    if (activeTabId === id && updatedTabs.length > 0) {
      setActiveTabId(updatedTabs[updatedTabs.length - 1].id);
    }
  };

  const handleUpdateTab = (updatedFields: Partial<Tab>) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, ...updatedFields } : t))
    );
  };

  // Select item from sidebar
  const handleSelectSavedRequest = (req: RequestType) => {
    setMobileSidebarOpen(false);
    // Check if request is already open in a tab
    const existingTab = tabs.find((t) => t.savedRequestId === req.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    const tabId = `saved_${req.id}`;
    const newTab: Tab = {
      id: tabId,
      name: req.name,
      type: 'saved',
      savedRequestId: req.id,
      method: req.method,
      url: req.url,
      headers: req.headers,
      params: req.params,
      body_type: req.body_type,
      body_raw: req.body_raw,
      body_raw_type: req.body_raw_type,
      body_form_data: req.body_form_data,
      body_urlencoded: req.body_urlencoded,
      auth_type: req.auth_type,
      auth_config: req.auth_config,
      isDirty: false,
      response: null,
      loading: false,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(tabId);
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setMobileSidebarOpen(false);
    const tabId = `history_${item.id}_${Date.now()}`;
    const newTab: Tab = {
      id: tabId,
      name: `${item.method}: ${item.url.split('?')[0].substring(0, 30) || 'History'}`,
      type: 'history',
      method: item.method,
      url: item.url,
      headers: item.headers,
      params: item.params,
      body_type: item.body_type,
      body_raw: item.body_raw,
      body_raw_type: 'JSON',
      body_form_data: [],
      body_urlencoded: [],
      auth_type: item.auth_type,
      auth_config: {},
      isDirty: true,
      response: {
        status: item.response_status,
        status_text: item.response_status_text,
        time_ms: item.response_time_ms,
        size_bytes: item.response_size_bytes,
        headers: item.response_headers,
        body: item.response_body,
      },
      loading: false,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(tabId);
  };

  const getActiveTab = (): Tab | undefined => {
    return tabs.find((t) => t.id === activeTabId);
  };

  const activeVariables = () => {
    if (!selectedEnvId) return [];
    const env = environments.find((e) => e.id === selectedEnvId);
    return env ? env.variables : [];
  };

  // Save request to collection (trigger backend endpoint)
  const handleSaveRequest = async (name: string, targetCollectionId: number) => {
    const activeTab = getActiveTab();
    if (!activeTab) return;

    const payload = {
      collection_id: targetCollectionId,
      name,
      method: activeTab.method,
      url: activeTab.url,
      headers: activeTab.headers,
      params: activeTab.params,
      body_type: activeTab.body_type,
      body_raw: activeTab.body_raw,
      body_raw_type: activeTab.body_raw_type || 'JSON',
      body_form_data: activeTab.body_form_data || [],
      body_urlencoded: activeTab.body_urlencoded || [],
      auth_type: activeTab.auth_type,
      auth_config: activeTab.auth_config || {},
    };

    try {
      let res;
      if (activeTab.type === 'saved' && activeTab.savedRequestId) {
        // Update request inside DB
        res = await fetch(`${API_BASE_URL}/api/requests/${activeTab.savedRequestId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Save new request inside DB
        res = await fetch(`${API_BASE_URL}/api/requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const savedReq = await res.json();
        showToast('Request saved successfully');
        
        // Refresh collections tree
        fetchCollections();

        // Update tab model
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab.id
              ? {
                  ...t,
                  type: 'saved',
                  savedRequestId: savedReq.id,
                  name: savedReq.name,
                  isDirty: false,
                }
              : t
          )
        );
      } else {
        showToast('Failed to save request');
      }
    } catch (e) {
      showToast('Error communicating with database');
    }
  };

  // Run proxy request execution (trigger backend runner)
  const handleSendRequest = async () => {
    const activeTab = getActiveTab();
    if (!activeTab) return;

    if (!activeTab.url) {
      showToast('URL cannot be blank');
      return;
    }

    // Set tab to loading status
    handleUpdateTab({ loading: true, response: null });

    const payload = {
      method: activeTab.method,
      url: activeTab.url,
      headers: activeTab.headers,
      params: activeTab.params,
      body_type: activeTab.body_type,
      body_raw: activeTab.body_raw,
      body_form_data: activeTab.body_form_data || [],
      body_urlencoded: activeTab.body_urlencoded || [],
      auth_type: activeTab.auth_type,
      auth_config: activeTab.auth_config || {},
      environment_id: selectedEnvId, // resolves variables on server side
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data: ResponseData = await res.json();
        // Update tab with result
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab.id
              ? { ...t, loading: false, response: data }
              : t
          )
        );
        // Refresh history log list
        fetchHistory();
      } else {
        const errText = await res.text();
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab.id
              ? {
                  ...t,
                  loading: false,
                  response: {
                    status: 0,
                    status_text: 'Error',
                    time_ms: 0,
                    size_bytes: 0,
                    headers: [],
                    error: `Gateway Error: ${errText}`,
                  },
                }
              : t
          )
        );
      }
    } catch (err: any) {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTab.id
            ? {
                ...t,
                loading: false,
                response: {
                  status: 0,
                  status_text: 'Network Error',
                  time_ms: 0,
                  size_bytes: 0,
                  headers: [],
                  error: `Failed to connect to local proxy runner: ${err.message}`,
                },
              }
            : t
        )
      );
    }
  };

  const handleShowPlaceholder = async (module: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/placeholders/${module}`);
      const data = await res.json();
      setPlaceholderText(data.message);
    } catch (e) {
      setPlaceholderText(`This premium feature (${module}) is coming soon.`);
    }
  };

  const activeTab = getActiveTab();

  return (
    <div className="app-container">
      {/* Top navigation panel */}
      <header className="top-nav">
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="sidebar-toggle-btn"
          title="Toggle Navigation"
        >
          <Menu size={18} />
        </button>

        <div className="top-nav-logo">
          <Layers size={18} className="logo-orange" />
          <span>anti <span className="logo-orange">Postman</span></span>
        </div>


        {/* Team collaboration space placeholder */}
        <div className="top-nav-middle-actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => handleShowPlaceholder('collaboration')}
            className="top-nav-workspace"
          >
            <Users size={13} style={{ color: 'var(--bg-accent)' }} />
            <span>My Workspace (Default)</span>
          </button>

          <button
            onClick={() => handleShowPlaceholder('mock-servers')}
            className="top-nav-workspace"
          >
            <Laptop size={13} />
            <span>Mock Servers</span>
          </button>
          
          <button
            onClick={() => handleShowPlaceholder('documentation')}
            className="top-nav-workspace"
          >
            <Share2 size={13} />
            <span>API Docs</span>
          </button>
        </div>

        {/* Environment selection widget */}
        <div className="env-selector-container">
          <select
            value={selectedEnvId || ''}
            onChange={(e) => setSelectedEnvId(e.target.value ? Number(e.target.value) : null)}
            className="env-dropdown"
          >
            <option value="">No Environment</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setIsEnvModalOpen(true)}
            className="cog-btn"
            title="Manage Environments"
          >
            <Settings size={14} />
          </button>
        </div>
      </header>

      {/* Main split panel */}
      <div className="workspace-container">
        {/* Sidebar wrapper */}
        <div className={`sidebar-wrapper ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
          <Sidebar
            collections={collections}
            history={history}
            environments={environments}
            selectedEnvId={selectedEnvId}
            apiBaseUrl={API_BASE_URL}
            onRefreshCollections={fetchCollections}
            onRefreshHistory={fetchHistory}
            onSelectRequest={handleSelectSavedRequest}
            onSelectHistory={handleSelectHistoryItem}
            onSelectEnvironment={(id) => setSelectedEnvId(id)}
            onOpenEnvModal={() => setIsEnvModalOpen(true)}
            showToast={showToast}
          />
        </div>

        {mobileSidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)} />
        )}

        {/* Workspace panel */}
        <main className="main-workspace">
          {tabs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Tab Header bar */}
              <div className="workspace-tabs-bar">
                {tabs.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setActiveTabId(t.id)}
                    className={`workspace-tab ${t.id === activeTabId ? 'active' : ''}`}
                  >
                    {/* Tiny badge indicating unsaved changes */}
                    {t.isDirty && (
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'var(--bg-accent)',
                          display: 'inline-block',
                        }}
                      />
                    )}
                    <span className="workspace-tab-name">{t.name}</span>
                    <button
                      onClick={(e) => handleCloseTab(t.id, e)}
                      className="workspace-tab-close"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {/* Add new Tab button */}
                <button onClick={handleAddNewTab} className="new-tab-btn" title="Open new tab">
                  <Plus size={16} />
                </button>
              </div>

              {/* Active Tab request/response split pane */}
              {activeTab && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                  {/* Request Builder */}
                  <RequestBuilder
                    tab={activeTab}
                    activeVariables={activeVariables()}
                    collections={collections}
                    onUpdateTab={handleUpdateTab}
                    onSend={handleSendRequest}
                    onSave={handleSaveRequest}
                  />

                  {/* Response Panel */}
                  <ResponseViewer response={activeTab.response || null} loading={activeTab.loading || false} />
                </div>
              )}
            </div>
          ) : (
            <div className="empty-workspace-state">
              <Laptop size={48} />
              <span>No tabs open</span>
              <button onClick={handleAddNewTab} className="empty-btn">
                New Tab
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Environment Variable Manager Modal */}
      <EnvironmentModal
        isOpen={isEnvModalOpen}
        onClose={() => setIsEnvModalOpen(false)}
        apiBaseUrl={API_BASE_URL}
        onRefreshEnvironments={fetchEnvironments}
        showToast={showToast}
      />

      {/* Placeholder Modal */}
      {placeholderText && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} style={{ color: 'var(--bg-accent)' }} /> Advanced Feature
              </h3>
              <button onClick={() => setPlaceholderText(null)} style={{ color: 'var(--text-secondary)' }}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px 16px', fontSize: '13px', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p>{placeholderText}</p>
              <div style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '10px 12px',
                fontSize: '11px',
                color: 'var(--text-secondary)'
              }}>
                💼 SDE Assignment Note: This advanced enterprise section is represented as a functional mockup.
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setPlaceholderText(null)} className="btn-primary">
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
