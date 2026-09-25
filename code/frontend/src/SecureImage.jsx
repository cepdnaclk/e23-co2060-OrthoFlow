import { useEffect, useState } from 'react';
import { getToken } from './api.js';
export default function SecureImage({ src, alt, ...props }) {
  const [image, setImage] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    setFailed(false); setImage(null);
    if (src?.startsWith('blob:')) { setImage(src); return; }
    fetch(src, { headers: { Authorization: `Bearer ${getToken()}` }, signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Image unavailable'); return response.blob(); })
      .then(blob => { if (controller.signal.aborted) return; objectUrl = URL.createObjectURL(blob); setImage(objectUrl); })
      .catch(error => { if (error.name !== 'AbortError') setFailed(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src]);
  if (!image) return <span role="img" aria-label={alt} style={props.style}>{failed ? 'Image unavailable' : 'Loading image...'}</span>;
  return <img {...props} src={image} alt={alt} />;
}
