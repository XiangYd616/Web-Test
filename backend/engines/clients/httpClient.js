/**
 * HTTP客户端
 * 提供HTTP请求功能
 */

const axios = require('axios');

class HTTPClient {
  constructor(options = {}) {
    this.options = {
      timeout: 30000,
      maxRedirects: 5,
      ...options
    };
    
    this.client = axios.create(this.options);
    this.setupInterceptors();
  }

  setupInterceptors() {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        config.startTime = Date.now();
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        response.duration = Date.now() - response.config.startTime;
        return response;
      },
      (error) => {
        if (error.config) {
          error.duration = Date.now() - error.config.startTime;
        }
        return Promise.reject(error);
      }
    );
  }

  async get(url, config = {}) {
    return this.client.get(url, config);
  }

  async post(url, data, config = {}) {
    return this.client.post(url, data, config);
  }

  async put(url, data, config = {}) {
    return this.client.put(url, data, config);
  }

  async delete(url, config = {}) {
    return this.client.delete(url, config);
  }

  async patch(url, data, config = {}) {
    return this.client.patch(url, data, config);
  }

  async head(url, config = {}) {
    return this.client.head(url, config);
  }

  async options(url, config = {}) {
    return this.client.options(url, config);
  }

  async request(config) {
    return this.client.request(config);
  }

  // 批量请求
  async batchRequest(requests) {
    const promises = requests.map(request => this.request(request));
    return Promise.allSettled(promises);
  }

  // 设置默认配置
  setDefaults(config) {
    Object.assign(this.client.defaults, config);
  }

  // 添加请求拦截器
  addRequestInterceptor(onFulfilled, onRejected) {
    return this.client.interceptors.request.use(onFulfilled, onRejected);
  }

  // 添加响应拦截器
  addResponseInterceptor(onFulfilled, onRejected) {
    return this.client.interceptors.response.use(onFulfilled, onRejected);
  }

  // 移除拦截器
  removeInterceptor(type, id) {
    this.client.interceptors[type].eject(id);
  }
}

module.exports = HTTPClient;
