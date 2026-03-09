import { useState } from 'react';
import { FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { getPhotoUrl } from '../../utils/helpers';

function PhotoGallery({ photos, onDelete }) {
  const [lightbox, setLightbox] = useState(null);

  if (!photos?.length) return null;

  const openLightbox = (index) => setLightbox(index);
  const closeLightbox = () => setLightbox(null);
  const prevPhoto = () => setLightbox((i) => (i > 0 ? i - 1 : photos.length - 1));
  const nextPhoto = () => setLightbox((i) => (i < photos.length - 1 ? i + 1 : 0));

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((photo, index) => (
          <div key={photo.id} className="relative group">
            <img
              src={getPhotoUrl(photo)}
              alt={photo.original_filename}
              onClick={() => openLightbox(index)}
              className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              loading="lazy"
            />
            {onDelete && (
              <button
                onClick={() => onDelete(photo.id)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <FiX className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <FiX className="w-8 h-8" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                className="absolute left-4 text-white hover:text-gray-300"
              >
                <FiChevronLeft className="w-10 h-10" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                className="absolute right-4 text-white hover:text-gray-300"
              >
                <FiChevronRight className="w-10 h-10" />
              </button>
            </>
          )}

          <img
            src={getPhotoUrl(photos[lightbox])}
            alt={photos[lightbox].original_filename}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

export default PhotoGallery;
