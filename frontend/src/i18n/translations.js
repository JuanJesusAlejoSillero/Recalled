const translations = {
  es: {
    // Navbar
    nav: {
      home: 'Inicio',
      places: 'Lugares',
      myReviews: 'Mis Reviews',
      newReview: 'Nueva Review',
      admin: 'Admin',
      logout: 'Salir',
      openMenu: 'Abrir menú',
    },

    // Login
    login: {
      title: '🌍 Recalled',
      subtitle: 'Inicia sesión para gestionar tus reviews',
      username: 'Usuario',
      password: 'Contraseña',
      usernamePlaceholder: 'Tu nombre de usuario',
      passwordPlaceholder: 'Tu contraseña',
      usernameRequired: 'El usuario es obligatorio',
      passwordRequired: 'La contraseña es obligatoria',
      submit: 'Iniciar sesión',
      submitting: 'Iniciando sesión...',
      error: 'Error al iniciar sesión',
    },

    // Home
    home: {
      greeting: 'Hola, {username}!',
      subtitle: 'Bienvenido a tu diario de viaje',
      stats: {
        reviews: 'Reviews',
        places: 'Lugares',
        average: 'Media',
        photos: 'Fotos',
      },
      topPlaces: 'Lugares mejor valorados',
      recentReviews: 'Reviews recientes',
      noReviews: '¡Aún no hay reviews. Crea la primera!',
    },

    // Places
    places: {
      title: 'Lugares',
      newPlace: 'Nuevo Lugar',
      cancel: 'Cancelar',
      searchPlaceholder: 'Buscar lugares...',
      search: 'Buscar',
      allCategories: 'Todas las categorías',
      noPlaces: 'No hay lugares registrados.',
      noRatings: 'Sin valoraciones',
      noRatingsYet: 'Sin valoraciones todavía',
      review: 'review',
      reviews: 'reviews',
      notFound: 'Lugar no encontrado',
      writeReview: 'Escribir Review',
      edit: 'Editar',
      delete: 'Eliminar',
      reviewsCount: 'Reviews ({count})',
      firstReview: '¡Sé el primero en escribir una review!',
      confirmDelete: '¿Eliminar "{name}" y todas sus reviews?',
      errorDelete: 'Error al eliminar lugar',
      errorCreate: 'Error al crear lugar',
      errorUpdate: 'Error al actualizar lugar',
      previous: 'Anterior',
      next: 'Siguiente',
      pageOf: 'Página {page} de {totalPages}',
    },

    // Place form
    placeForm: {
      name: 'Nombre del lugar',
      nameRequired: 'El nombre es obligatorio',
      namePlaceholder: 'Ej: Torre Eiffel',
      address: 'Dirección',
      addressPlaceholder: 'Ej: Champ de Mars, Paris',
      category: 'Categoría',
      noCategory: 'Sin categoría',
      latitude: 'Latitud',
      latitudePlaceholder: '-90 a 90',
      longitude: 'Longitud',
      longitudePlaceholder: '-180 a 180',
      saving: 'Guardando...',
      update: 'Actualizar',
      create: 'Crear Lugar',
      cancel: 'Cancelar',
    },

    // Categories
    categories: {
      restaurant: 'Restaurante',
      hotel: 'Hotel',
      museum: 'Museo',
      park: 'Parque',
      beach: 'Playa',
      monument: 'Monumento',
      shopping: 'Tienda',
      nightlife: 'Vida nocturna',
      cafe: 'Cafetería',
      bar: 'Bar',
      other: 'Otro',
    },

    // Reviews
    reviewPage: {
      title: 'Mis Reviews',
      noReviews: 'Aún no has escrito ninguna review.',
      confirmDelete: '¿Eliminar esta review?',
      errorDelete: 'Error al eliminar review',
      editTitle: 'Editar Review',
      newTitle: 'Nueva Review',
      errorSave: 'Error al guardar review',
    },

    // Review form
    reviewForm: {
      place: 'Lugar',
      existingPlace: 'Lugar existente',
      newPlace: 'Nuevo lugar',
      newPlacePlaceholder: 'Nombre del nuevo lugar',
      selectPlace: 'Selecciona un lugar...',
      placeNameRequired: 'Escribe el nombre del lugar',
      selectPlaceRequired: 'Selecciona un lugar',
      rating: 'Puntuación',
      ratingRequired: 'Selecciona una puntuación',
      titleLabel: 'Título',
      titleMaxLength: 'Máximo 200 caracteres',
      titlePlaceholder: 'Un título para tu review',
      comment: 'Comentario',
      commentPlaceholder: 'Cuenta tu experiencia...',
      visitDate: 'Fecha de visita',
      photos: 'Fotos',
      saving: 'Guardando...',
      update: 'Actualizar Review',
      create: 'Crear Review',
    },

    // Review card
    reviewCard: {
      showLess: 'Ver menos',
      showMore: 'Ver más',
      visited: 'Visitado: {date}',
      by: 'por',
      edit: 'Editar',
      delete: 'Eliminar',
    },

    // Image uploader
    imageUploader: {
      dragOrSelect: 'Arrastra fotos aquí o ',
      selectFiles: 'selecciona archivos',
      fileInfo: 'JPG, PNG, WEBP - Max 5MB por foto ({count}/{maxFiles})',
    },

    // Admin
    admin: {
      dashboard: 'Panel de Administración',
      users: 'Usuarios',
      places: 'Lugares',
      reviews: 'Reviews',
      userManagement: 'Gestión de Usuarios',
      newUser: 'Nuevo Usuario',
      cancel: 'Cancelar',
      loadingUsers: 'Cargando usuarios...',
      tableUser: 'Usuario',
      tableEmail: 'Email',
      tableRole: 'Rol',
      tableCreated: 'Creado',
      tableActions: 'Acciones',
      roleAdmin: 'Admin',
      roleUser: 'Usuario',
      deleteUser: 'Eliminar usuario',
      confirmDeleteUser: '¿Eliminar al usuario "{username}"? Se eliminarán todas sus reviews.',
      errorDeleteUser: 'Error al eliminar usuario',
    },

    // Create user form
    createUser: {
      title: 'Crear Nuevo Usuario',
      username: 'Usuario',
      email: 'Email',
      password: 'Contraseña',
      isAdmin: 'Es administrador',
      required: 'Obligatorio',
      minChars3: 'Mínimo 3 caracteres',
      minChars8: 'Mínimo 8 caracteres',
      usernamePattern: 'Solo letras, números y _',
      creating: 'Creando...',
      create: 'Crear Usuario',
      error: 'Error al crear usuario',
    },

    // Theme toggle
    theme: {
      switchToDark: 'Cambiar a modo oscuro',
      switchToLight: 'Cambiar a modo claro',
      dark: 'Modo oscuro',
      light: 'Modo claro',
    },

    // Footer
    footer: {
      rights: '© {year} Recalled. Todos los derechos reservados.',
    },

    // Common
    common: {
      newReview: 'Nueva Review',
    },
  },

  en: {
    nav: {
      home: 'Home',
      places: 'Places',
      myReviews: 'My Reviews',
      newReview: 'New Review',
      admin: 'Admin',
      logout: 'Log out',
      openMenu: 'Open menu',
    },

    login: {
      title: '🌍 Recalled',
      subtitle: 'Log in to manage your reviews',
      username: 'Username',
      password: 'Password',
      usernamePlaceholder: 'Your username',
      passwordPlaceholder: 'Your password',
      usernameRequired: 'Username is required',
      passwordRequired: 'Password is required',
      submit: 'Log in',
      submitting: 'Logging in...',
      error: 'Login failed',
    },

    home: {
      greeting: 'Hi, {username}!',
      subtitle: 'Welcome to your travel journal',
      stats: {
        reviews: 'Reviews',
        places: 'Places',
        average: 'Average',
        photos: 'Photos',
      },
      topPlaces: 'Top rated places',
      recentReviews: 'Recent reviews',
      noReviews: "No reviews yet. Create your first one!",
    },

    places: {
      title: 'Places',
      newPlace: 'New Place',
      cancel: 'Cancel',
      searchPlaceholder: 'Search places...',
      search: 'Search',
      allCategories: 'All categories',
      noPlaces: 'No places registered.',
      noRatings: 'No ratings',
      noRatingsYet: 'No ratings yet',
      review: 'review',
      reviews: 'reviews',
      notFound: 'Place not found',
      writeReview: 'Write Review',
      edit: 'Edit',
      delete: 'Delete',
      reviewsCount: 'Reviews ({count})',
      firstReview: 'Be the first to write a review!',
      confirmDelete: 'Delete "{name}" and all its reviews?',
      errorDelete: 'Error deleting place',
      errorCreate: 'Error creating place',
      errorUpdate: 'Error updating place',
      previous: 'Previous',
      next: 'Next',
      pageOf: 'Page {page} of {totalPages}',
    },

    placeForm: {
      name: 'Place name',
      nameRequired: 'Name is required',
      namePlaceholder: 'E.g. Eiffel Tower',
      address: 'Address',
      addressPlaceholder: 'E.g. Champ de Mars, Paris',
      category: 'Category',
      noCategory: 'No category',
      latitude: 'Latitude',
      latitudePlaceholder: '-90 to 90',
      longitude: 'Longitude',
      longitudePlaceholder: '-180 to 180',
      saving: 'Saving...',
      update: 'Update',
      create: 'Create Place',
      cancel: 'Cancel',
    },

    categories: {
      restaurant: 'Restaurant',
      hotel: 'Hotel',
      museum: 'Museum',
      park: 'Park',
      beach: 'Beach',
      monument: 'Monument',
      shopping: 'Shop',
      nightlife: 'Nightlife',
      cafe: 'Café',
      bar: 'Bar',
      other: 'Other',
    },

    reviewPage: {
      title: 'My Reviews',
      noReviews: "You haven't written any reviews yet.",
      confirmDelete: 'Delete this review?',
      errorDelete: 'Error deleting review',
      editTitle: 'Edit Review',
      newTitle: 'New Review',
      errorSave: 'Error saving review',
    },

    reviewForm: {
      place: 'Place',
      existingPlace: 'Existing place',
      newPlace: 'New place',
      newPlacePlaceholder: 'New place name',
      selectPlace: 'Select a place...',
      placeNameRequired: 'Enter the place name',
      selectPlaceRequired: 'Select a place',
      rating: 'Rating',
      ratingRequired: 'Select a rating',
      titleLabel: 'Title',
      titleMaxLength: '200 characters max',
      titlePlaceholder: 'A title for your review',
      comment: 'Comment',
      commentPlaceholder: 'Tell us about your experience...',
      visitDate: 'Visit date',
      photos: 'Photos',
      saving: 'Saving...',
      update: 'Update Review',
      create: 'Create Review',
    },

    reviewCard: {
      showLess: 'Show less',
      showMore: 'Show more',
      visited: 'Visited: {date}',
      by: 'by',
      edit: 'Edit',
      delete: 'Delete',
    },

    imageUploader: {
      dragOrSelect: 'Drag photos here or ',
      selectFiles: 'select files',
      fileInfo: 'JPG, PNG, WEBP - Max 5MB per photo ({count}/{maxFiles})',
    },

    admin: {
      dashboard: 'Admin Dashboard',
      users: 'Users',
      places: 'Places',
      reviews: 'Reviews',
      userManagement: 'User Management',
      newUser: 'New User',
      cancel: 'Cancel',
      loadingUsers: 'Loading users...',
      tableUser: 'User',
      tableEmail: 'Email',
      tableRole: 'Role',
      tableCreated: 'Created',
      tableActions: 'Actions',
      roleAdmin: 'Admin',
      roleUser: 'User',
      deleteUser: 'Delete user',
      confirmDeleteUser: 'Delete user "{username}"? All their reviews will be deleted.',
      errorDeleteUser: 'Error deleting user',
    },

    createUser: {
      title: 'Create New User',
      username: 'Username',
      email: 'Email',
      password: 'Password',
      isAdmin: 'Is administrator',
      required: 'Required',
      minChars3: 'Minimum 3 characters',
      minChars8: 'Minimum 8 characters',
      usernamePattern: 'Only letters, numbers and _',
      creating: 'Creating...',
      create: 'Create User',
      error: 'Error creating user',
    },

    theme: {
      switchToDark: 'Switch to dark mode',
      switchToLight: 'Switch to light mode',
      dark: 'Dark mode',
      light: 'Light mode',
    },

    footer: {
      rights: '© {year} Recalled. All rights reserved.',
    },

    common: {
      newReview: 'New Review',
    },
  },
};

export default translations;
