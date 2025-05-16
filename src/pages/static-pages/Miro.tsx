import React from 'react';

const MiroPage = () => (
  <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', margin: 0, padding: 0, zIndex: 1 }}>
    <iframe
      src="https://miro.com/app/live-embed/uXjVLqP6csQ=/?moveToViewport=-1735,-2223,5413,5341&embedId=940466837901"
      frameBorder="0"
      scrolling="no"
      allow="fullscreen; clipboard-read; clipboard-write"
      allowFullScreen
      title="Miro Mindmap"
      style={{ width: '100vw', height: '100vh', border: 'none', display: 'block' }}
    ></iframe>
  </div>
);

export default MiroPage;
