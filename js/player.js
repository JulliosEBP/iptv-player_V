var Player = {
  videoElement: null,
  currentChannel: null,
  isLive: false,

  init: function() {
    this.videoElement = document.getElementById('videoPlayer');
    this.bindEvents();
  },

  bindEvents: function() {
    var self = this;

    this.videoElement.addEventListener('timeupdate', function() {
      self.onTimeUpdate();
    });

    this.videoElement.addEventListener('loadedmetadata', function() {
      self.onMetadataLoaded();
    });

    this.videoElement.addEventListener('ended', function() {
      self.onEnded();
    });

    document.getElementById('progressBar').addEventListener('click', function(e) {
      if (!self.isLive) {
        self.seekByClick(e);
      }
    });
  },

  play: function(channel) {
    this.currentChannel = channel;
    this.isLive = this.detectLive(channel.url);

    this.videoElement.src = channel.url;
    this.videoElement.play();

    document.getElementById('nowPlaying').textContent = 'Reproduciendo: ' + channel.name;
    this.updateEPG(channel);

    if (channel.subtitle) {
      SubtitleManager.loadSubtitles(channel.subtitle);
    } else {
      SubtitleManager.clear();
    }

    if (!this.isLive) {
      this.restoreProgress(channel.url);
    }

    document.getElementById('skipIntroBtn').classList.add('hidden');
  },

  detectLive: function(url) {
    if (!url) return true;
    return url.indexOf('.m3u8') !== -1 && url.indexOf('live') !== -1;
  },

  onTimeUpdate: function() {
    var currentTime = this.videoElement.currentTime;
    var duration = this.videoElement.duration;

    SubtitleManager.update(currentTime);

    if (!this.isLive && duration > 0 && isFinite(duration)) {
      var progress = (currentTime / duration) * 100;
      document.getElementById('progress').style.width = progress + '%';
      document.getElementById('currentTime').textContent = this.formatTime(currentTime);
      document.getElementById('duration').textContent = this.formatTime(duration);
    }

    if (this.currentChannel) {
      var shouldShow = SkipMarker.shouldShowSkip(this.currentChannel.url, currentTime);
      var skipBtn = document.getElementById('skipIntroBtn');
      if (shouldShow) {
        skipBtn.classList.remove('hidden');
      } else {
        skipBtn.classList.add('hidden');
      }
    }

    if (this.currentChannel && !this.isLive && duration > 0 && isFinite(duration)) {
      HistoryManager.updateProgress(this.currentChannel.url, currentTime, duration);

      // Guardar progreso de series
      if (this.currentChannel.type === 'series' && this.currentChannel.seriesName) {
        HistoryManager.saveSeriesProgress(
          this.currentChannel.seriesName,
          this.currentChannel.episode,
          this.currentChannel.url,
          currentTime,
          this.currentChannel.season
        );
      }
    }
  },

  onMetadataLoaded: function() {
    var duration = this.videoElement.duration;
    if (this.isLive || !isFinite(duration)) {
      document.getElementById('timeDisplay').style.display = 'none';
      document.getElementById('progressBar').style.display = 'none';
    } else {
      document.getElementById('timeDisplay').style.display = 'block';
      document.getElementById('progressBar').style.display = 'block';
    }
  },

  onEnded: function() {
    if (this.currentChannel) {
      HistoryManager.addToHistory({
        title: this.currentChannel.name,
        url: this.currentChannel.url,
        type: this.currentChannel.type || 'movie',
        position: this.videoElement.duration,
        duration: this.videoElement.duration
      });
    }
  },

  restoreProgress: function(url) {
    var history = HistoryManager.getHistory();
    for (var i = 0; i < history.length; i++) {
      if (history[i].url === url && history[i].position > 10) {
        var self = this;
        var pos = history[i].position;
        setTimeout(function() {
          if (confirm('¿Continuar desde ' + self.formatTime(pos) + '?')) {
            self.videoElement.currentTime = pos;
          }
        }, 500);
        break;
      }
    }
  },

  seek: function(seconds) {
    if (!this.isLive && isFinite(this.videoElement.duration)) {
      var newTime = this.videoElement.currentTime + seconds;
      if (newTime < 0) newTime = 0;
      if (newTime > this.videoElement.duration) newTime = this.videoElement.duration;
      this.videoElement.currentTime = newTime;
    }
  },

  seekByClick: function(e) {
    if (this.isLive) return;
    var bar = document.getElementById('progressBar');
    var rect = bar.getBoundingClientRect();
    var percent = (e.clientX - rect.left) / rect.width;
    this.videoElement.currentTime = percent * this.videoElement.duration;
  },

  updateEPG: function(channel) {
    var program = EPGParser.getCurrentProgram(channel.id);
    if (program) {
      document.getElementById('epgInfo').textContent =
        'Ahora: ' + program.title + ' - ' + program.desc;
    } else {
      document.getElementById('epgInfo').textContent = '';
    }
  },

  formatTime: function(seconds) {
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return hours + ':' +
             (minutes < 10 ? '0' : '') + minutes + ':' +
             (secs < 10 ? '0' : '') + secs;
    } else {
      return (minutes < 10 ? '0' : '') + minutes + ':' +
             (secs < 10 ? '0' : '') + secs;
    }
  },

  stop: function() {
    this.videoElement.pause();
    this.videoElement.src = '';
    document.getElementById('nowPlaying').textContent = '';
    document.getElementById('epgInfo').textContent = '';
    SubtitleManager.clear();
  }
};