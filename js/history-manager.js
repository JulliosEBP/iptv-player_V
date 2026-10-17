var HistoryManager = {
  history: [],
  seriesProgress: {},

  init: function() {
    var savedHistory = localStorage.getItem('iptv_history');
    var savedSeries = localStorage.getItem('iptv_series_progress');
    this.history = savedHistory ? JSON.parse(savedHistory) : [];
    this.seriesProgress = savedSeries ? JSON.parse(savedSeries) : {};
  },

  addToHistory: function(item) {
    var existing = -1;
    for (var i = 0; i < this.history.length; i++) {
      if (this.history[i].url === item.url) {
        existing = i;
        break;
      }
    }
    if (existing >= 0) {
      this.history.splice(existing, 1);
    }
    item.timestamp = Date.now();
    this.history.unshift(item);
    if (this.history.length > 100) {
      this.history = this.history.slice(0, 100);
    }
    localStorage.setItem('iptv_history', JSON.stringify(this.history));
  },

  updateProgress: function(url, position, duration) {
    for (var i = 0; i < this.history.length; i++) {
      if (this.history[i].url === url) {
        this.history[i].position = position;
        this.history[i].duration = duration;
        break;
      }
    }
    localStorage.setItem('iptv_history', JSON.stringify(this.history));
  },

  saveSeriesProgress: function(seriesName, episodeNum, episodeUrl, position, season) {
    this.seriesProgress[seriesName] = {
      episode: episodeNum,
      season: season,
      url: episodeUrl,
      position: position,
      timestamp: Date.now()
    };
    localStorage.setItem('iptv_series_progress', JSON.stringify(this.seriesProgress));
  },

  getSeriesProgress: function(seriesName) {
    return this.seriesProgress[seriesName] || null;
  },

  getHistory: function() {
    return this.history;
  },

  clearHistory: function() {
    this.history = [];
    localStorage.removeItem('iptv_history');
  }
};