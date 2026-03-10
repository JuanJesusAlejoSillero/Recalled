#!/usr/bin/env bash

# Script de inicialización del backend
# Se ejecuta cuando el contenedor de Docker arranca

set -e

echo "=========================================="
echo "Iniciando Recalled Backend"
echo "=========================================="

# Esperar un momento para asegurar que los directorios están montados
sleep 2

# Verificar que los directorios necesarios existen
echo "Verificando directorios..."
mkdir -p /app/data /app/uploads/photos /app/logs

# Establecer permisos correctos
chmod -R 755 /app/uploads /app/data /app/logs

# Inicializar la base de datos y asegurar que el admin existe
python << END
from app import create_app, db
from app.models.user import User
import os

app = create_app()
with app.app_context():
    # Crear todas las tablas (no hace nada si ya existen)
    db.create_all()

    # Add TOTP columns to existing databases
    import sqlalchemy
    inspector = sqlalchemy.inspect(db.engine)
    columns = [col["name"] for col in inspector.get_columns("users")]
    if "totp_secret" not in columns:
        with db.engine.connect() as conn:
            conn.execute(sqlalchemy.text(
                "ALTER TABLE users ADD COLUMN totp_secret VARCHAR(32)"
            ))
            conn.execute(sqlalchemy.text(
                "ALTER TABLE users ADD COLUMN totp_enabled BOOLEAN NOT NULL DEFAULT 0"
            ))
            conn.commit()
        print("✓ TOTP columns added to users table")
    
    # Add is_private column to reviews table
    review_columns = [col["name"] for col in inspector.get_columns("reviews")]
    if "is_private" not in review_columns:
        with db.engine.connect() as conn:
            conn.execute(sqlalchemy.text(
                "ALTER TABLE reviews ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT 0"
            ))
            conn.commit()
        print("✓ is_private column added to reviews table")
    print("✓ Base de datos verificada")

    # Crear usuario administrador si no existe
    admin_username = os.getenv('ADMIN_USERNAME', 'admin')
    admin_email = os.getenv('ADMIN_EMAIL', 'admin@example.com')
    admin_password = os.getenv('ADMIN_PASSWORD')
    if not admin_password:
        print('ERROR: ADMIN_PASSWORD environment variable is required')
        exit(1)

    existing_admin = User.query.filter_by(username=admin_username).first()
    if not existing_admin:
        admin = User(
            username=admin_username,
            email=admin_email,
            is_admin=True
        )
        admin.set_password(admin_password)
        db.session.add(admin)
        db.session.commit()
        print(f"✓ Usuario administrador creado: {admin_username}")
        print(f"  Email: {admin_email}")
        print(f"  IMPORTANTE: Cambiar la contraseña después del primer login")
    else:
        print(f"✓ Usuario administrador ya existe: {admin_username}")
END

echo "=========================================="
echo "Configuración completada"
echo "Iniciando servidor Flask..."
echo "=========================================="

# Iniciar la aplicación Flask con Gunicorn para producción
if [ "$FLASK_ENV" = "production" ]; then
    echo "Modo: PRODUCCIÓN"
    exec gunicorn -w 4 -b 0.0.0.0:5000 --timeout 120 --access-logfile /app/logs/access.log --error-logfile /app/logs/error.log "run:app"
else
    echo "Modo: DESARROLLO"
    exec flask run --host=0.0.0.0 --port=5000
fi
