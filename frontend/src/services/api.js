import axios from 'axios';

const api = axios.create({
  // Geralmente é https://localhost:7001 ou http://localhost:5000
  baseURL: 'http://localhost:5033/api',
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