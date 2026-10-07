import { useRef, useState } from 'react';
import { Camera, ImagePlus, Image as ImageIcon, X } from 'lucide-react';
import { validatePhoto } from '../utils/reportValidation';
export default function PhotoUploader({ photo, preview, onChange }) {
  const camera = useRef(null);
  const gallery = useRef(null);
  const [error, setError] = useState('');
  async function selectFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const invalid = validatePhoto(file);
    if (invalid) { setError(invalid); return; }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    try { await image.decode(); onChange(file, url); setError(''); }
    catch { URL.revokeObjectURL(url); setError('This image could not be opened. Choose another photo.'); }
  }
  return <div className="photo-uploader"><div className={`photo-preview ${preview ? 'has-photo' : ''}`}>{preview ? <><img src={preview} alt="Selected hazard evidence"/><button type="button" aria-label="Remove photo" onClick={() => { onChange(null, ''); setError(''); }}><X size={18}/></button></> : <div><ImageIcon size={44}/><h2>Add a photo of the hazard</h2><p>A clear photo helps explain what happened.</p></div>}</div><div className="photo-actions"><button type="button" onClick={() => camera.current.click()}><Camera size={18}/>Take Photo</button><button type="button" onClick={() => gallery.current.click()}><ImagePlus size={18}/>Choose from Gallery</button></div><input ref={camera} className="sr-only" tabIndex={-1} aria-label="Take hazard photo" type="file" accept="image/jpeg,image/png" capture="environment" onChange={selectFile}/><input ref={gallery} className="sr-only" tabIndex={-1} aria-label="Choose hazard photo" type="file" accept="image/jpeg,image/png" onChange={selectFile}/><p className="mobile-hint">Optional • JPEG or PNG • up to 2 MB</p>{photo && <p className="photo-filename">{photo.name}</p>}{error && <p className="mobile-error" role="alert">{error}</p>}</div>;
}
