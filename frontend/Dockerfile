FROM node:20-alpine
WORKDIR /app

# Copia os manifestos e instala as dependências
COPY package*.json ./
RUN npm ci

# Copia o código e expõe a porta padrão do Vite em modo dev/host
COPY . .
EXPOSE 5173

# O parâmetro --host é vital para o Docker conseguir rotear a porta para fora do container
CMD ["npm", "run", "dev", "--", "--host"]