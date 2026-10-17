var SkipMarker = {
  markers: {},

  init: function() {
    var saved = localStorage.getItem('iptv_skip_markers');
    this.markers = saved ? JSON.parse(saved) : {};
  },

  addMarker: function(url, start, end) {
    this.markers[url] = {
      start: start,
      end: end
    };
    localStorage.setItem('iptv_skip_markers', JSON.stringify(this.markers));
  },

  getMarker: function(url) {
    return this.markers[url] || null;
  },

  shouldShowSkip: function(url, currentTime) {
    var marker = this.markers[url];
    if (!marker) return false;
    return currentTime >= marker.start && currentTime < marker.end;
  },

  skip: function(url, video) {
    var marker = this.markers[url];
    if (marker) {
      video.currentTime = marker.end;
    }
  },

  removeMarker: function(url) {
    delete this.markers[url];
    localStorage.setItem('iptv_skip_markers', JSON.stringify(this.markers));
  }
};