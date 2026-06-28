import React, { useState } from 'react';
import { Loader2, Globe, AlertCircle, Clock, Database, CheckCircle2 } from 'lucide-react';
import { ResponseData } from '../types';

interface ResponseViewerProps {
  response: ResponseData | null;
  loading: boolean;
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({ response, loading }) => {
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
  const [bodyMode, setBodyMode] = useState<'pretty' | 'raw' | 'preview'>('pretty');

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          background: 'var(--bg-primary)',
          borderTop: '1px solid var(--border-color)',
          gap: '12px',
        }}
      >
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--bg-accent)' }} />
        <span style={{ fontSize: '13px', letterSpacing: '0.05em' }}>Sending request...</span>
      </div>
    );
  }

  if (!response) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          background: 'var(--bg-primary)',
          borderTop: '1px solid var(--border-color)',
          gap: '8px',
          userSelect: 'none',
        }}
      >
        <Globe size={48} style={{ color: 'var(--border-light)', marginBottom: '8px' }} />
        <span style={{ fontSize: '14px', fontWeight: 500 }}>Response Panel</span>
        <span style={{ fontSize: '12px' }}>Enter URL and click Send to inspect outbound payload response.</span>
      </div>
    );
  }

  // Handle errors
  if (response.error) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444',
          background: 'var(--bg-primary)',
          borderTop: '1px solid var(--border-color)',
          padding: '24px',
          gap: '12px',
          textAlign: 'center',
        }}
      >
        <AlertCircle size={40} />
        <span style={{ fontWeight: 600, fontSize: '15px' }}>Could not send request</span>
        <div
          style={{
            maxWidth: '500px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '6px',
            padding: '12px 16px',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            textAlign: 'left',
          }}
        >
          {response.error}
        </div>
      </div>
    );
  }

  // Helper to highlight JSON syntax
  const getPrettyJsonHTML = (jsonText?: string) => {
    if (!jsonText) return '';
    try {
      const obj = JSON.parse(jsonText);
      const str = JSON.stringify(obj, null, 2);
      
      // Escape HTML characters to prevent XSS
      const safeStr = str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      return safeStr.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
        (match) => {
          let cls = 'json-number';
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'json-key';
            } else {
              cls = 'json-string';
            }
          } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
          } else if (/null/.test(match)) {
            cls = 'json-null';
          }
          return `<span class="${cls}">${match}</span>`;
        }
      );
    } catch (e) {
      // Return raw string if not JSON
      return jsonText;
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'var(--color-get)';
    if (status >= 300 && status < 400) return 'var(--color-post)';
    if (status >= 400) return 'var(--color-delete)';
    return 'var(--text-secondary)';
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isJsonBody = () => {
    const contentType = response.headers.find(
      (h) => h.key.toLowerCase() === 'content-type'
    );
    return contentType?.value.toLowerCase().includes('application/json') || false;
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-color)',
        overflow: 'hidden',
      }}
    >
      {/* Response Header Status Metrics */}
      <div
        style={{
          height: '44px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          background: 'var(--bg-secondary)',
        }}
      >
        <div style={{ display: 'flex', gap: '16px' }}>
          {/* Body and Headers Tabs */}
          <button
            onClick={() => setActiveTab('body')}
            style={{
              padding: '12px 14px',
              fontSize: '13px',
              fontWeight: 500,
              color: activeTab === 'body' ? 'var(--bg-accent)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'body' ? '2px solid var(--bg-accent)' : '2px solid transparent',
            }}
          >
            Body
          </button>
          <button
            onClick={() => setActiveTab('headers')}
            style={{
              padding: '12px 14px',
              fontSize: '13px',
              fontWeight: 500,
              color: activeTab === 'headers' ? 'var(--bg-accent)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'headers' ? '2px solid var(--bg-accent)' : '2px solid transparent',
            }}
          >
            Headers ({response.headers.length})
          </button>
        </div>

        {/* Status Metrics */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
            <span
              style={{
                color: getStatusColor(response.status),
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {response.status} {response.status_text}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={13} style={{ color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Time:</span>
            <span style={{ color: 'var(--color-get)', fontWeight: 600 }}>{response.time_ms} ms</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={13} style={{ color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Size:</span>
            <span style={{ color: 'var(--color-get)', fontWeight: 600 }}>{formatSize(response.size_bytes)}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'body' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Pretty / Raw / Preview Mode Selector */}
            <div
              style={{
                height: '32px',
                background: 'var(--bg-primary)',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '4px', padding: '2px' }}>
                <button
                  onClick={() => setBodyMode('pretty')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    borderRadius: '3px',
                    fontWeight: 600,
                    background: bodyMode === 'pretty' ? 'var(--bg-secondary)' : 'transparent',
                    color: bodyMode === 'pretty' ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  Pretty
                </button>
                <button
                  onClick={() => setBodyMode('raw')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    borderRadius: '3px',
                    fontWeight: 600,
                    background: bodyMode === 'raw' ? 'var(--bg-secondary)' : 'transparent',
                    color: bodyMode === 'raw' ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  Raw
                </button>
                {isJsonBody() && (
                  <button
                    onClick={() => setBodyMode('preview')}
                    style={{
                      padding: '3px 8px',
                      fontSize: '11px',
                      borderRadius: '3px',
                      fontWeight: 600,
                      background: bodyMode === 'preview' ? 'var(--bg-secondary)' : 'transparent',
                      color: bodyMode === 'preview' ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    Preview
                  </button>
                )}
              </div>
            </div>

            {/* Body View Renderers */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
              {bodyMode === 'pretty' && (
                <pre
                  className="pretty-json-container"
                  dangerouslySetInnerHTML={{ __html: getPrettyJsonHTML(response.body) }}
                />
              )}

              {bodyMode === 'raw' && (
                <textarea
                  readOnly
                  value={response.body || ''}
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: '#e3e3e3',
                    padding: '12px',
                    resize: 'none',
                    outline: 'none',
                  }}
                />
              )}

              {bodyMode === 'preview' && (
                <div style={{ background: '#fff', color: '#000', padding: '16px', borderRadius: '4px', height: '100%', overflow: 'auto' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px' }}>
                    {response.body ? JSON.stringify(JSON.parse(response.body), null, 2) : ''}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'headers' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <table className="kv-table" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 16px' }}>Header Name</th>
                  <th style={{ padding: '10px 16px' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {response.headers.map((h, i) => (
                  <tr key={i}>
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      {h.key}
                    </td>
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', borderBottom: '1px solid var(--border-color)' }}>
                      {h.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default ResponseViewer;
