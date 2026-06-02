import { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const formatarRole = (roleString) => {
    if (!roleString) return "User";
    const limpa = roleString.trim();
    return limpa.charAt(0).toUpperCase() + limpa.slice(1).toLowerCase();
  };

  const extrairClaim = (decodedToken, chaveLonga, chaveCurta) => {
    return decodedToken[chaveLonga] || decodedToken[chaveCurta] || null;
  };

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token) {
      try {
        const decoded = jwtDecode(token);

        // unidades explicitadas para facilitar manutenção
        const expiradoEm = decoded.exp * 1000; 
        if (expiradoEm < Date.now()) {
          // lógica de logout inlinada para evitar dependência externa no useEffect
          localStorage.removeItem('token');
          setUser(null);
        } else {
          const id = extrairClaim(decoded, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier", "sub") || decoded.id;
          const nome = extrairClaim(decoded, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name", "unique_name") || decoded.name;
          const papelToken = extrairClaim(decoded, "http://schemas.microsoft.com/ws/2008/06/identity/claims/role", "role");

          setUser({
            id,
            nome,
            role: formatarRole(papelToken)
          });
        }
      } catch (error) {
        console.error("Token inválido no carregamento:", error);
        // CORREÇÃO 1: mesma lógica inlinada no catch
        localStorage.removeItem('token');
        setUser(null);
      }
    }

    setLoading(false);
  }, []);

  const login = async (email, senha) => {
    const response = await api.post('/auth/login', { email, senha });

    const token = response.data?.token || response.data?.Token;

    if (!token) {
      throw new Error("O token de autenticação não foi retornado pelo servidor.");
    }

    localStorage.setItem('token', token);

    const decoded = jwtDecode(token);

    console.log("Payload do JWT decodificado no Login:", decoded);

    const id = extrairClaim(decoded, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier", "sub") || decoded.id;
    const nome = extrairClaim(decoded, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name", "unique_name") || decoded.name;
    const papelToken = extrairClaim(decoded, "http://schemas.microsoft.com/ws/2008/06/identity/claims/role", "role");

    const roleFormatada = formatarRole(papelToken);

    setUser({ id, nome, role: roleFormatada });

    return roleFormatada;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ authenticated: !!user, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);