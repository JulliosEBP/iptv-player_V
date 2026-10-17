var App = {
  channels: [],
  filteredChannels: [],
  selectedIndex: 0,
  currentTab: 'channels',
  currentGroup: 'all',
  searchQuery: '',
  currentSource: 'm3u',

  init: function() {
    Player.init();
    HistoryManager.init();
    SubtitleManager.init();
    SkipMarker.init();

    this.bindEvents();
    this.loadSubtitleSettings();
    this.renderHistory();
    this.tryAutoConnectXtream();
  },

  bindEvents: function() {
    var self = this;

    document.getElementById('loadBtn').addEventListener('click', function() {
      self.loadPlaylist();
    });

    var sourceTabs = document.querySelectorAll('.source-tab');
    for (var i = 0; i < sourceTabs.length; i++) {
      sourceTabs[i].addEventListener('click', function(e) {
        self.switchSource(e.target.getAttribute('data-source'));
      });
    }

    document.getElementById('xtreamLoginBtn').addEventListener('click', function() {
      self.xtreamLogin();
    });

    document.getElementById('searchInput').addEventListener('input', function(e) {
      self.searchQuery = e.target.value.toLowerCase();
      self.applyFilters();
    });

    document.getElementById('groupFilter').addEventListener('change', function(e) {
      self.currentGroup = e.target.value;
      self.applyFilters();
    });

    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function(e) {
        self.switchTab(e.target.getAttribute('data-tab'));
      });
    }

    document.getElementById('saveSettings').addEventListener('click', function() {
      self.saveSubtitleSettings();
    });

    document.getElementById('subSize').addEventListener('input', function(e) {
      document.getElementById('subSizeValue').textContent = e.target.value;
    });

    document.getElementById('skipIntroBtn').addEventListener('click', function() {
      if (Player.currentChannel) {
        SkipMarker.skip(Player.currentChannel.url, Player.videoElement);
      }
    });

    document.addEventListener('keydown', function(e) {
      self.handleRemote(e);
    });
  },

  switchSource: function(source) {
    this.currentSource = source;
    var tabs = document.querySelectorAll('.source-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.remove('active');
      if (tabs[i].getAttribute('data-source') === source) {
        tabs[i].classList.add('active');
      }
    }
    var contents = document.querySelectorAll('.source-content');
    for (var i = 0; i < contents.length; i++) {
      contents[i].classList.remove('active');
    }
    document.getElementById(source + 'Source').classList.add('active');
  },

  xtreamLogin: function() {
    var host = document.getElementById('xtreamHost').value.trim();
    var user = document.getElementById('xtreamUser').value.trim();
    var pass = document.getElementById('xtreamPass').value.trim();
    var status = document.getElementById('xtreamStatus');

    if (!host || !user || !pass) {
      status.className = 'error';
      status.textContent = 'Completa todos los campos';
      return;
    }

    var self = this;
    status.className = 'loading';
    status.textContent = 'Conectando...';

    XtreamAPI.login(host, user, pass, function(err, data) {
      if (err) {
        status.className = 'error';
        status.textContent = 'Error: ' + err;
        return;
      }

      status.className = 'loading';
      status.textContent = 'Cargando canales...';

      XtreamAPI.loadAll(function(loadErr) {
        if (loadErr) {
          status.className = 'error';
          status.textContent = 'Error parcial: ' + loadErr;
        } else {
          var exp = data.user_info.exp_date;
          var expText = exp ? new Date(exp * 1000).toLocaleDateString() : 'Ilimitada';
          status.className = 'success';
          status.textContent = 'Conectado. Vence: ' + expText;
        }

        self.channels = XtreamAPI.toChannelList();
        self.filteredChannels = self.channels.slice();
        self.populateGroupFilter();
        self.renderChannels();
      });
    });
  },

  tryAutoConnectXtream: function() {
    if (!XtreamAPI.hasSavedCredentials()) return;
    var creds = JSON.parse(localStorage.getItem('iptv_xtream_creds'));
    document.getElementById('xtreamHost').value = creds.host || '';
    document.getElementById('xtreamUser').value = creds.username || '';
    document.getElementById('xtreamPass').value = creds.password || '';

    var self = this;
    var status = document.getElementById('xtreamStatus');
    status.className = 'loading';
    status.textContent = 'Reconectando...';

    XtreamAPI.login(creds.host, creds.username, creds.password, function(err) {
      if (err) {
        status.className = '';
        status.style.display = 'none';
        return;
      }
      XtreamAPI.loadAll(function() {
        self.channels = XtreamAPI.toChannelList();
        self.filteredChannels = self.channels.slice();
        self.populateGroupFilter();
        self.renderChannels();
        status.className = 'success';
        status.textContent = 'Sesión restaurada';
      });
    });
  },

  switchTab: function(tabName) {
    this.currentTab = tabName;
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.remove('active');
      if (tabs[i].getAttribute('data-tab') === tabName) {
        tabs[i].classList.add('active');
      }
    }
    var contents = document.querySelectorAll('.tab-content');
    for (var i = 0; i < contents.length; i++) {
      contents[i].classList.remove('active');
    }
    document.getElementById(tabName + 'Tab').classList.add('active');
    if (tabName === 'history') {
      this.renderHistory();
    }
  },

  loadPlaylist: function() {
    var url = document.getElementById('urlInput').value.trim();
    var epgUrl = document.getElementById('epgInput').value.trim();

    if (!url) {
      alert('Ingresa una URL de lista M3U');
      return;
    }

    var self = this;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          App.channels = M3UParser.parse(xhr.responseText);
          App.filteredChannels = App.channels.slice();
          App.populateGroupFilter();
          App.renderChannels();
          if (epgUrl) {
            App.loadEPG(epgUrl);
          }
        } else {
          alert('Error al cargar la lista: ' + xhr.status);
        }
      }
    };
    xhr.send();
  },

  loadEPG: function(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        EPGParser.parse(xhr.responseText);
      }
    };
    xhr.send();
  },

  populateGroupFilter: function() {
    var select = document.getElementById('groupFilter');
    select.innerHTML = '<option value="all">Todos los grupos</option>';
    var groups = M3UParser.getGroups(this.channels);
    for (var i = 0; i < groups.length; i++) {
      var option = document.createElement('option');
      option.value = groups[i];
      option.textContent = groups[i];
      select.appendChild(option);
    }
  },

  applyFilters: function() {
    this.filteredChannels = [];
    for (var i = 0; i < this.channels.length; i++) {
      var channel = this.channels[i];
      if (this.currentGroup !== 'all' && channel.group !== this.currentGroup) {
        continue;
      }
      if (this.searchQuery && channel.name.toLowerCase().indexOf(this.searchQuery) === -1) {
        continue;
      }
      this.filteredChannels.push(channel);
    }
    this.renderChannels();
  },

  renderChannels: function() {
    var list = document.getElementById('channelList');
    list.innerHTML = '';

    for (var i = 0; i < this.filteredChannels.length; i++) {
      var li = document.createElement('li');
      li.textContent = this.filteredChannels[i].name;
      li.setAttribute('data-index', i);
      li.setAttribute('tabindex', '0');

      var self = this;
      li.addEventListener('click', (function(index) {
        return function() {
          self.selectChannel(index);
        };
      })(i));

      list.appendChild(li);
    }

    if (this.filteredChannels.length > 0) {
      this.selectedIndex = 0;
      var firstItem = list.querySelector('li');
      if (firstItem) {
        firstItem.classList.add('active');
        firstItem.focus();
      }
    }
  },

  renderHistory: function() {
    var list = document.getElementById('historyList');
    list.innerHTML = '';
    var history = HistoryManager.getHistory();

    for (var i = 0; i < history.length; i++) {
      var li = document.createElement('li');
      var item = history[i];
      var progress = '';
      if (item.duration > 0 && item.position > 0) {
        var percent = Math.round((item.position / item.duration) * 100);
        progress = ' (' + percent + '%)';
      }
      li.textContent = item.title + progress;
      li.setAttribute('data-index', i);
      li.setAttribute('tabindex', '0');

      var self = this;
      li.addEventListener('click', (function(histItem) {
        return function() {
          Player.play({
            name: histItem.title,
            url: histItem.url,
            type: histItem.type
          });
        };
      })(item));

      list.appendChild(li);
    }
  },

  selectChannel: function(index) {
    var channel = this.filteredChannels[index];
    if (!channel) return;

    this.selectedIndex = index;

    var items = document.querySelectorAll('#channelList li');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove('active');
    }
    items[index].classList.add('active');
    items[index].focus();

    var self = this;

    if (channel.source === 'xtream' && channel.type === 'series') {
      this.openSeriesSelector(channel);
      return;
    }

    Player.play(channel);

    HistoryManager.addToHistory({
      title: channel.name,
      url: channel.url,
      type: channel.type || 'live',
      position: 0,
      duration: 0
    });
  },

  openSeriesSelector: function(channel) {
    var self = this;
    var status = document.getElementById('xtreamStatus');
    status.className = 'loading';
    status.textContent = 'Cargando episodios...';

    XtreamAPI.getSeriesInfo(channel.seriesId, function(err, data) {
      if (err || !data) {
        status.className = 'error';
        status.textContent = 'Error al cargar serie';
        return;
      }

      status.className = 'success';
      status.textContent = channel.name;

      var episodes = data.episodes || {};
      var seasons = Object.keys(episodes).sort(function(a, b) {
        return parseInt(a) - parseInt(b);
      });

      var episodeList = [];
      for (var s = 0; s < seasons.length; s++) {
        var seasonNum = seasons[s];
        var eps = episodes[seasonNum];
        for (var e = 0; e < eps.length; e++) {
          var ep = eps[e];
          episodeList.push({
            name: 'T' + seasonNum + 'E' + ep.episode_num + ' — ' + (ep.title || 'Episodio'),
            url: XtreamAPI.buildEpisodeUrl(ep.id, ep.container_extension || 'mkv'),
            group: channel.group,
            id: '',
            logo: channel.logo,
            type: 'series',
            source: 'xtream',
            seriesName: channel.name,
            season: parseInt(seasonNum),
            episode: parseInt(ep.episode_num)
          });
        }
      }

      self.channels = episodeList;
      self.filteredChannels = episodeList.slice();
      self.populateGroupFilter();
      self.renderChannels();

      var progress = HistoryManager.getSeriesProgress(channel.name);
      if (progress) {
        for (var i = 0; i < episodeList.length; i++) {
          if (episodeList[i].season === progress.season &&
              episodeList[i].episode === progress.episode) {
            self.selectChannel(i);
            break;
          }
        }
      }
    });
  },

  loadSubtitleSettings: function() {
    document.getElementById('subFont').value = SubtitleManager.settings.font;
    document.getElementById('subSize').value = SubtitleManager.settings.size;
    document.getElementById('subSizeValue').textContent = SubtitleManager.settings.size;
    document.getElementById('subColor').value = SubtitleManager.settings.color;
    document.getElementById('subBgColor').value = SubtitleManager.settings.bgColor;
    SubtitleManager.applyStyles();
  },

  saveSubtitleSettings: function() {
    SubtitleManager.settings.font = document.getElementById('subFont').value;
    SubtitleManager.settings.size = parseInt(document.getElementById('subSize').value);
    SubtitleManager.settings.color = document.getElementById('subColor').value;
    SubtitleManager.settings.bgColor = document.getElementById('subBgColor').value;
    SubtitleManager.saveSettings();
    alert('Ajustes guardados');
  },

  handleRemote: function(e) {
    var keyCode = e.keyCode;

    var KEY_UP = 38;
    var KEY_DOWN = 40;
    var KEY_LEFT = 37;
    var KEY_RIGHT = 39;
    var KEY_ENTER = 13;
    var KEY_BACK = 10009;
    var KEY_PLAY = 415;
    var KEY_PAUSE = 19;
    var KEY_RED = 403;
    var KEY_GREEN = 404;

    switch (keyCode) {
      case KEY_UP:
        if (this.currentTab === 'channels' && this.selectedIndex > 0) {
          this.selectChannel(this.selectedIndex - 1);
        }
        e.preventDefault();
        break;

      case KEY_DOWN:
        if (this.currentTab === 'channels' && this.selectedIndex < this.filteredChannels.length - 1) {
          this.selectChannel(this.selectedIndex + 1);
        }
        e.preventDefault();
        break;

      case KEY_LEFT:
        Player.seek(-10);
        e.preventDefault();
        break;

      case KEY_RIGHT:
        Player.seek(10);
        e.preventDefault();
        break;

      case KEY_ENTER:
        if (this.currentTab === 'channels' && this.filteredChannels.length > 0) {
          Player.play(this.filteredChannels[this.selectedIndex]);
        }
        e.preventDefault();
        break;

      case KEY_BACK:
        if (document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'SELECT') {
          document.activeElement.blur();
        } else {
          tizen.application.getCurrentApplication().exit();
        }
        e.preventDefault();
        break;

      case KEY_PLAY:
        Player.videoElement.play();
        e.preventDefault();
        break;

      case KEY_PAUSE:
        Player.videoElement.pause();
        e.preventDefault();
        break;

      case KEY_RED:
        if (Player.currentChannel && !Player.isLive) {
          var currentTime = Player.videoElement.currentTime;
          SkipMarker.addMarker(Player.currentChannel.url, currentTime, currentTime + 90);
          alert('Intro marcada desde ' + Player.formatTime(currentTime));
        }
        e.preventDefault();
        break;

      case KEY_GREEN:
        if (Player.currentChannel) {
          SkipMarker.skip(Player.currentChannel.url, Player.videoElement);
        }
        e.preventDefault();
        break;
    }
  }
};

window.onload = function() {
  App.init();
};