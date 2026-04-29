#!/bin/sh

echo "⏳ Esperando a la base de datos..."

until pg_isready -h db -p 5432; do
  sleep 1
done

echo "✅ DB lista, iniciando app..."

npm run dev