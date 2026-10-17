var M3UParser = {
  parse: function(content) {
    var channels = [];
    var lines = content.split('\n');
    var currentChannel = null;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();

      if (line.indexOf('#EXTINF:') === 0) {
        var match = line.match(/,(.+)$/);
        var name = match ? match[1] : 'Canal desconocido';

        var groupMatch = line.match(/group-title="([^"]*)"/);
        var group = groupMatch ? groupMatch[1] : 'Sin grupo';

        var idMatch = line.match(/tvg-id="([^"]*)"/);
        var id = idMatch ? idMatch[1] : '';

        var logoMatch = line.match(/tvg-logo="([^"]*)"/);
        var logo = logoMatch ? logoMatch[1] : '';

        currentChannel = {
          name: name,
          url: '',
          group: group,
          id: id,
          logo: logo,
          type: 'live',
          source: 'm3u'
        };
      } else if (line && line.indexOf('#') !== 0 && currentChannel) {
        currentChannel.url = line;
        channels.push(currentChannel);
        currentChannel = null;
      }
    }

    return channels;
  },

  getGroups: function(channels) {
    var groups = {};
    for (var i = 0; i < channels.length; i++) {
      var group = channels[i].group;
      if (group && !groups[group]) {
        groups[group] = true;
      }
    }
    return Object.keys(groups).sort();
  }
};