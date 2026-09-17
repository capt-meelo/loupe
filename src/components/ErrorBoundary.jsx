import React from 'react';

/**
 * A crash inside the tree used to blank the page, which gives you nothing to
 * act on. This catches it and shows the real error and stack instead.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('Loupe crashed:', error, info);
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{
        height: '100vh', overflow: 'auto', padding: 24, background: 'var(--bg, #0a0b0d)',
        color: 'var(--ink, #e8ebef)', fontFamily: 'ui-monospace, monospace', fontSize: 12, lineHeight: 1.7
      }}>
        <div style={{ color: 'var(--err, #ff6b6b)', fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
          Loupe hit a runtime error
        </div>
        <div style={{ marginBottom: 14, color: 'var(--ink2, #98a0aa)' }}>
          The UI stopped rendering. The error is below: copy it and the app can be fixed.
        </div>

        <pre style={{
          whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, padding: 12,
          border: '1px solid var(--line2, #2f353c)', borderRadius: 8, background: 'var(--bg2, #101215)'
        }}>{String(error?.stack || error)}</pre>

        {info?.componentStack && (
          <pre style={{
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 12, padding: 12,
            color: 'var(--ink2, #98a0aa)',
            border: '1px solid var(--line, #23272d)', borderRadius: 8, background: 'var(--bg2, #101215)'
          }}>{info.componentStack}</pre>
        )}

        <button
          onClick={() => this.setState({ error: null, info: null })}
          style={{
            marginTop: 14, padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
            border: '1px solid var(--line2, #2f353c)', background: 'var(--bg3, #16191d)',
            color: 'var(--ink, #e8ebef)', font: 'inherit'
          }}>
          Try to re-render
        </button>
      </div>
    );
  }
}
