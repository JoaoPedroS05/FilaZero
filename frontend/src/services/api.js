import axios from 'axios';

const api = axios.create({
  // Tenta ler a variável injetada pelo Docker/Vite. 
  // Se ela não existir (rodando fora do Docker), usa o seu fallback padrão automaticamente.
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5033/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para injetar o Token JWT automaticamente em futuras requisições protegidas
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;