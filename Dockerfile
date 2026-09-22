FROM node:22-alpine

WORKDIR /app

# El proyecto no tiene dependencias: se copia tal cual.
COPY package.json ./
COPY bin ./bin
COPY src ./src

# La base de datos vive aqui. En Render o Fly se monta un disco persistente
# en esta ruta para que los clientes no se pierdan en cada despliegue.
RUN mkdir -p /app/data
ENV DB_PATH=/app/data/appos.db
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/salud || exit 1

CMD ["node", "src/server.js"]
