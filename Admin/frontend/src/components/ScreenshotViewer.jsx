import React, { useState } from 'react';

export default function ScreenshotViewer({ images = [] }) {
    const [index, setIndex] = useState(null);

    if (!images || images.length === 0) {
        return <p className="text-sm text-gray-500">No screenshots available.</p>;
    }

    const open = (i) => setIndex(i);
    const close = () => setIndex(null);
    const prev = () => setIndex((s) => (s === 0 ? images.length - 1 : s - 1));
    const next = () => setIndex((s) => (s === images.length - 1 ? 0 : s + 1));

    return (
        <div>
            <div className="grid grid-cols-3 gap-3">
                {images.map((img, i) => (
                    <button key={i} onClick={() => open(i)} className="p-0 rounded overflow-hidden shadow-sm hover:shadow-md">
                        <img src={`http://localhost:5000${img.url}`} alt={img.alt || `Screenshot ${i + 1}`} className="w-full h-28 object-cover rounded" />
                    </button>
                ))}
            </div>

            {index !== null && (
                <div className="fixed inset-0 z-60 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/80" onClick={close} />
                    <div className="relative max-w-4xl w-full mx-4">
                        <button onClick={close} className="absolute top-3 right-3 text-white bg-black/30 p-2 rounded-full hover:bg-black/40">✕</button>
                        <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 text-white bg-black/30 p-2 rounded-full hover:bg-black/40">‹</button>
                        <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 text-white bg-black/30 p-2 rounded-full hover:bg-black/40">›</button>
                        <div className="bg-white dark:bg-slate-900 rounded shadow-lg overflow-hidden">
                            <img src={`http://localhost:5000${images[index].url}`} alt={images[index].alt || 'Screenshot'} className="w-full h-[70vh] object-contain bg-black" />
                            {images[index].timestamp && (
                                <div className="p-3 text-center bg-gray-50 dark:bg-slate-800">
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{new Date(images[index].timestamp).toLocaleString()}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
