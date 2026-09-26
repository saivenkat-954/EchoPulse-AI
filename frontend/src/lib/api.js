import axios from 'axios';

export const token=()=>localStorage.getItem('ecopulse_token')||'';
export const setToken=t=>t?localStorage.setItem('ecopulse_token',t):localStorage.removeItem('ecopulse_token');

export const api=axios.create({
  baseURL:import.meta.env.VITE_API_URL || '/api',
  timeout:15000,
  headers:{'Content-Type':'application/json'}
});

api.interceptors.request.use(config=>{
  const t=token();
  if(t) config.headers.Authorization=`Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  response=>response,
  error=>{
    if(error.response?.status===401 && location.pathname!=='/login'){
      setToken('');
      location.href='/login';
    }
    return Promise.reject(error);
  }
);
