import { FiStar } from 'react-icons/fi';

function StarRating({ rating, onChange, size = 'md', readonly = false }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };
  const sizeClass = sizes[size] || sizes.md;

  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        >
          <FiStar
            className={`${sizeClass} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        </button>
      ))}
      {!readonly && rating > 0 && (
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">{rating}/5</span>
      )}
    </div>
  );
}

export default StarRating;
