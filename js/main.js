  loadPlaylist: function() {
    var url = document.getElementById('urlInput').value.trim();
    var epgUrl = document.getElementById('epgInput').value.trim();

    if (!url) {
      alert('Ingresa una URL de lista M3U');
      return;
    }

    var self = this;
    
    // NUEVO: usar CORSProxy en lugar de XHR directo
    CORSProxy.fetch(url, function(err, content) {
      if (err) {
        alert('Error al cargar la lista: ' + err);
        return;
      }
      App.channels = M3UParser.parse(content);
      App.filteredChannels = App.channels.slice();
      App.populateGroupFilter();
      App.renderChannels();
      if (epgUrl) {
        App.loadEPG(epgUrl);
      }
    });
  },

  loadEPG: function(url) {
    // NUEVO: usar CORSProxy
    CORSProxy.fetch(url, function(err, content) {
      if (!err && content) {
        EPGParser.parse(content);
      }
    });
  },