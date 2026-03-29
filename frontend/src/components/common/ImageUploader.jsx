import { useState, useRef } from 'react';
import { FiUpload, FiX } from 'react-icons/fi';
import { useLanguage } from '../../context/LanguageContext';

function ImageUploader({ onFilesSelected, maxFiles = 5 }) {
  const { t } = useLanguage();
  const [previews, setPreviews] = useState([]);
  const fileInputRef = useRef(null);

  if (maxFiles <= 0) return null;

  const handleFiles = (fileList) => {
    const files = Array.from(fileList).slice(0, maxFiles - previews.length);
    const newPreviews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    }));

    const updated = [...previews, ...newPreviews].slice(0, maxFiles);
    setPreviews(updated);
    onFilesSelected(updated.map((p) => p.file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const removePreview = (index) => {
    const updated = previews.filter((_, i) => i !== index);
    URL.revokeObjectURL(previews[index].url);
    setPreviews(updated);
    onFilesSelected(updated.map((p) => p.file));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium ${
          previews.length >= maxFiles
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-gray-500 dark:text-gray-400'
        }`}>
          {t('imageUploader.counter', { count: previews.length, max: maxFiles })}
        </span>
      </div>

      {previews.length < maxFiles && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
        >
          <FiUpload className="w-8 h-8 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('imageUploader.dragOrSelect')}<span className="text-primary-600 dark:text-primary-400 font-medium">{t('imageUploader.selectFiles')}</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {t('imageUploader.fileInfo')}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>
      )}

      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview.url}
                alt={preview.name}
                className="w-full h-24 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removePreview(index); }}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <FiX className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ImageUploader;
