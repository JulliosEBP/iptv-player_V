var EPGParser = {
  programs: {},

  parse: function(xmlText) {
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    var programmes = xmlDoc.getElementsByTagName('programme');

    this.programs = {};

    for (var i = 0; i < programmes.length; i++) {
      var prog = programmes[i];
      var channel = prog.getAttribute('channel');
      var start = prog.getAttribute('start');
      var stop = prog.getAttribute('stop');
      var title = prog.getElementsByTagName('title')[0];
      var desc = prog.getElementsByTagName('desc')[0];

      if (!this.programs[channel]) {
        this.programs[channel] = [];
      }

      this.programs[channel].push({
        start: this.parseDate(start),
        stop: this.parseDate(stop),
        title: title ? title.textContent : 'Sin título',
        desc: desc ? desc.textContent : ''
      });
    }

    return this.programs;
  },

  parseDate: function(dateStr) {
    if (!dateStr) return null;
    var year = dateStr.substr(0, 4);
    var month = dateStr.substr(4, 2);
    var day = dateStr.substr(6, 2);
    var hour = dateStr.substr(8, 2);
    var min = dateStr.substr(10, 2);
    var sec = dateStr.substr(12, 2);
    return new Date(year + '-' + month + '-' + day + 'T' + hour + ':' + min + ':' + sec);
  },

  getCurrentProgram: function(channelId) {
    if (!this.programs[channelId]) return null;
    var now = new Date();
    var programs = this.programs[channelId];
    for (var i = 0; i < programs.length; i++) {
      if (programs[i].start <= now && programs[i].stop > now) {
        return programs[i];
      }
    }
    return null;
  }
};