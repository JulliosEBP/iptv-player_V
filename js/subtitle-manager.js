var SubtitleManager = {
  cues: [],
  settings: {
    font: 'Arial',
    size: 24,
    color: '#ffffff',
    bgColor: '#000000'
  },
  overlay: null,

  init: function() {
    this.overlay = document.getElementById('subtitleOverlay');
    this.loadSettings();
  },

  loadSettings: function() {
    var saved = localStorage.getItem('iptv_subtitle_settings');
    if (saved) {
      this.settings = JSON.parse(saved);
    }
  },

  saveSettings: function() {
    localStorage.setItem('iptv_subtitle_settings', JSON.stringify(this.settings));
    this.applyStyles();
  },

  applyStyles: function() {
    if (this.overlay) {
      this.overlay.style.fontFamily = this.settings.font;
      this.overlay.style.fontSize = this.settings.size + 'px';
      this.overlay.style.color = this.settings.color;
    }
  },

  loadSubtitles: function(url) {
    var self = this;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        self.cues = self.parseVTT(xhr.responseText);
      }
    };
    xhr.send();
  },

  parseVTT: function(text) {
    var cues = [];
    var lines = text.split('\n');
    var i = 0;
    while (i < lines.length) {
      var line = lines[i].trim();
      if (line.indexOf('-->') !== -1) {
        var times = line.split(' --> ');
        var start = this.parseTime(times[0]);
        var end = this.parseTime(times[1]);
        var textArr = [];
        i++;
        while (i < lines.length && lines[i].trim() !== '') {
          textArr.push(lines[i].trim());
          i++;
        }
        cues.push({
          start: start,
          end: end,
          text: textArr.join(' ')
        });
      }
      i++;
    }
    return cues;
  },

  parseTime: function(timeStr) {
    var parts = timeStr.split(':');
    var hours = 0;
    var minutes = 0;
    var seconds = 0;
    if (parts.length === 3) {
      hours = parseInt(parts[0]);
      minutes = parseInt(parts[1]);
      seconds = parseFloat(parts[2]);
    } else if (parts.length === 2) {
      minutes = parseInt(parts[0]);
      seconds = parseFloat(parts[1]);
    }
    return hours * 3600 + minutes * 60 + seconds;
  },

  update: function(currentTime) {
    if (!this.overlay) return;
    var activeCue = null;
    for (var i = 0; i < this.cues.length; i++) {
      if (currentTime >= this.cues[i].start && currentTime < this.cues[i].end) {
        activeCue = this.cues[i];
        break;
      }
    }
    if (activeCue) {
      this.overlay.innerHTML = '<span>' + activeCue.text + '</span>';
      this.applyStyles();
    } else {
      this.overlay.innerHTML = '';
    }
  },

  clear: function() {
    this.cues = [];
    if (this.overlay) {
      this.overlay.innerHTML = '';
    }
  }
};