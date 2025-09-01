import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || '';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class ApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    this.cache = {};
    
    // Add request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Add response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Handle 401 errors by redirecting to login
        if (error.response && error.response.status === 401) {
          // Clear token and redirect to login
          localStorage.removeItem('auth_token');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }
  
  // GET request with caching
  async get(url, config = {}) {
    const cacheKey = `${url}:${JSON.stringify(config)}`;
    const cached = this.cache[cacheKey];
    
    // Return cached data if valid
    if (cached && cached.timestamp > Date.now() - CACHE_DURATION) {
      return Promise.resolve(cached.data);
    }
    
    // Make request and cache result
    try {
      const response = await this.client.get(url, config);
      this.cache[cacheKey] = {
        data: response,
        timestamp: Date.now()
      };
      return response;
    } catch (error) {
      // Cache certain error responses too to prevent hammering
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        this.cache[cacheKey] = {
          data: error.response,
          timestamp: Date.now()
        };
      }
      throw error;
    }
  }
  
  // Other methods without caching
  post(url, data, config = {}) {
    return this.client.post(url, data, config);
  }
  
  // Additional methods for other HTTP verbs
}

export default new ApiClient();