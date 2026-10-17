var XtreamAPI = {
  host: '',
  username: '',
  password: '',
  userInfo: null,
  liveCategories: [],
  vodCategories: [],
  seriesCategories: [],
  liveStreams: [],
  vodStreams: [],
  series: [],

  saveCredentials: function() {
    var creds = {
      host: this.host,
      username: this.username,
      password: this.password
    };
    localStorage.setItem('iptv_xtream_creds', JSON.stringify(creds));
  },

  loadCredentials: function() {
    var saved = localStorage.getItem('iptv_xtream_creds');
    if (saved) {
      var creds = JSON.parse(saved);
      this.host = creds.host || '';
      this.username = creds.username || '';
      this.password = creds.password || '';
      return true;
    }
    return false;
  },

  normalizeHost: function(host) {
    host = host.trim();
    if (host.charAt(host.length - 1) === '/') {
      host = host.substr(0, host.length - 1);
    }
    if (host.indexOf('http') !== 0) {
      host = 'http://' + host;
    }
    return host;
  },

  buildUrl: function(params) {
    var base = this.host + '/player_api.php?username=' +
               encodeURIComponent(this.username) +
               '&password=' + encodeURIComponent(this.password);
    if (params) {
      base += '&' + params;
    }
    return base;
  },

   request: function(url, callback) {
    var self = this;
    
    // Si hay proxy activado, usar CORSProxy
    if (this.useProxy && typeof CORSProxy !== 'undefined') {
      CORSProxy.fetch(url, function(err, content) {
        if (err) {
          callback(err, null);
          return;
        }
        try {
          var data = JSON.parse(content);
          callback(null, data);
        } catch (e) {
          callback('JSON inválido', null);
        }
      });
      return;
    }
    
    // Petición directa (para Tizen y otros entornos nativos)
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            callback(null, data);
          } catch (err) {
            callback('JSON inválido', null);
          }
        } else {
          callback('HTTP ' + xhr.status, null);
        }
      }
    };
    xhr.onerror = function() {
      callback('Error de red', null);
    };
    xhr.send();
  },

  login: function(host, user, pass, callback) {
    this.host = this.normalizeHost(host);
    this.username = user;
    this.password = pass;
    var self = this;
    var url = this.buildUrl('');
    this.request(url, function(err, data) {
      if (err) {
        callback(err, null);
        return;
      }
      if (!data || !data.user_info) {
        callback('Credenciales inválidas', null);
        return;
      }
      if (data.user_info.auth === 0) {
        callback('Cuenta no autorizada', null);
        return;
      }
      self.userInfo = data.user_info;
      self.serverInfo = data.server_info;
      self.saveCredentials();
      callback(null, data);
    });
  },

  loadAll: function(callback) {
    var self = this;
    var pending = 6;
    var errors = [];

    function done(err) {
      if (err) errors.push(err);
      pending--;
      if (pending === 0) {
        callback(errors.length > 0 ? errors.join('; ') : null);
      }
    }

    this.request(this.buildUrl('action=get_live_categories'), function(err, data) {
      self.liveCategories = (err || !data) ? [] : data;
      done(err);
    });

    this.request(this.buildUrl('action=get_live_streams'), function(err, data) {
      self.liveStreams = (err || !data) ? [] : data;
      done(err);
    });

    this.request(this.buildUrl('action=get_vod_categories'), function(err, data) {
      self.vodCategories = (err || !data) ? [] : data;
      done(err);
    });

    this.request(this.buildUrl('action=get_vod_streams'), function(err, data) {
      self.vodStreams = (err || !data) ? [] : data;
      done(err);
    });

    this.request(this.buildUrl('action=get_series_categories'), function(err, data) {
      self.seriesCategories = (err || !data) ? [] : data;
      done(err);
    });

    this.request(this.buildUrl('action=get_series'), function(err, data) {
      self.series = (err || !data) ? [] : data;
      done(err);
    });
  },

  getCategoryName: function(categoryId) {
    var i, cat;
    for (i = 0; i < this.liveCategories.length; i++) {
      cat = this.liveCategories[i];
      if (String(cat.category_id) === String(categoryId)) return cat.category_name;
    }
    for (i = 0; i < this.vodCategories.length; i++) {
      cat = this.vodCategories[i];
      if (String(cat.category_id) === String(categoryId)) return cat.category_name;
    }
    for (i = 0; i < this.seriesCategories.length; i++) {
      cat = this.seriesCategories[i];
      if (String(cat.category_id) === String(categoryId)) return cat.category_name;
    }
    return 'Sin categoría';
  },

  buildStreamUrl: function(streamId, type, container) {
    var base = this.host + '/' + type + '/' +
               encodeURIComponent(this.username) + '/' +
               encodeURIComponent(this.password) + '/' +
               streamId;
    if (container) {
      base += '.' + container;
    }
    return base;
  },

  toChannelList: function() {
    var channels = [];
    var i, item, groupName, channel;

    for (i = 0; i < this.liveStreams.length; i++) {
      item = this.liveStreams[i];
      groupName = '📺 ' + this.getCategoryName(item.category_id);
      channel = {
        name: item.name || 'Sin nombre',
        url: this.buildStreamUrl(item.stream_id, 'live', 'm3u8'),
        group: groupName,
        id: item.epg_channel_id || '',
        logo: item.stream_icon || '',
        type: 'live',
        source: 'xtream',
        streamId: item.stream_id,
        rating: item.rating || '',
        container: item.container_extension || 'm3u8'
      };
      channels.push(channel);
    }

    for (i = 0; i < this.vodStreams.length; i++) {
      item = this.vodStreams[i];
      groupName = '🎬 ' + this.getCategoryName(item.category_id);
      channel = {
        name: item.name || 'Sin nombre',
        url: this.buildStreamUrl(item.stream_id, 'movie', item.container_extension || 'mkv'),
        group: groupName,
        id: '',
        logo: item.stream_icon || '',
        type: 'movie',
        source: 'xtream',
        streamId: item.stream_id,
        rating: item.rating || '',
        container: item.container_extension || 'mkv'
      };
      channels.push(channel);
    }

    for (i = 0; i < this.series.length; i++) {
      item = this.series[i];
      groupName = '📀 ' + this.getCategoryName(item.category_id);
      channel = {
        name: item.name || 'Sin nombre',
        url: '',
        group: groupName,
        id: '',
        logo: item.cover || '',
        type: 'series',
        source: 'xtream',
        seriesId: item.series_id,
        rating: item.rating || '',
        plot: item.plot || ''
      };
      channels.push(channel);
    }

    return channels;
  },

  getSeriesInfo: function(seriesId, callback) {
    var url = this.buildUrl('action=get_series_info&series_id=' + seriesId);
    this.request(url, callback);
  },

  buildEpisodeUrl: function(episodeId, container) {
    return this.host + '/series/' +
           encodeURIComponent(this.username) + '/' +
           encodeURIComponent(this.password) + '/' +
           episodeId + '.' + (container || 'mkv');
  },

  hasSavedCredentials: function() {
    return !!localStorage.getItem('iptv_xtream_creds');
  }
};