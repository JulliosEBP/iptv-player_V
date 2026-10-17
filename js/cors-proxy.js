// Proxy CORS para evitar bloqueos del navegador
// Puedes cambiar por tu propio proxy si lo prefieres
var CORSProxy = {
  // Lista de proxies públicos (pueden tener límites de uso)
  proxies: [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://cors-anywhere.herokuapp.com/'
  ],
  currentIndex: 0,
  enabled: true, // Cambia a false si usas tu propio servidor

  // Intenta hacer petición directa primero, si falla usa proxy
  fetch: function(url, callback) {
    var self = this;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          callback(null, xhr.responseText);
        } else {
          // Intentar con proxy
          self.fetchWithProxy(url, callback);
        }
      }
    };
    
    xhr.onerror = function() {
      self.fetchWithProxy(url, callback);
    };
    
    xhr.send();
  },

  fetchWithProxy: function(url, callback) {
    if (!this.enabled) {
      callback('Error CORS: no se pudo conectar', null);
      return;
    }

    var proxyUrl = this.proxies[this.currentIndex] + encodeURIComponent(url);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', proxyUrl, true);
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          callback(null, xhr.responseText);
        } else {
          // Probar siguiente proxy
          CORSProxy.currentIndex++;
          if (CORSProxy.currentIndex < CORSProxy.proxies.length) {
            CORSProxy.fetchWithProxy(url, callback);
          } else {
            callback('Todos los proxies fallaron', null);
          }
        }
      }
    };
    
    xhr.onerror = function() {
      CORSProxy.currentIndex++;
      if (CORSProxy.currentIndex < CORSProxy.proxies.length) {
        CORSProxy.fetchWithProxy(url, callback);
      } else {
        callback('Error de red en todos los proxies', null);
      }
    };
    
    xhr.send();
  }
};