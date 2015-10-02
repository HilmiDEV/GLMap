(function(global) {var Color = (function(window) {


var w3cColors = {
  aqua:'#00ffff',
  black:'#000000',
  blue:'#0000ff',
  fuchsia:'#ff00ff',
  gray:'#808080',
  grey:'#808080',
  green:'#008000',
  lime:'#00ff00',
  maroon:'#800000',
  navy:'#000080',
  olive:'#808000',
  orange:'#ffa500',
  purple:'#800080',
  red:'#ff0000',
  silver:'#c0c0c0',
  teal:'#008080',
  white:'#ffffff',
  yellow:'#ffff00'
};

function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1/6) return p + (q-p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q-p) * (2/3 - t) * 6;
  return p;
}

function clamp(v, max) {
  return Math.min(max, Math.max(0, v));
}

var Color = function(h, s, l, a) {
  this.H = h;
  this.S = s;
  this.L = l;
  this.A = a;
};

/*
 * str can be in any of these:
 * #0099ff rgb(64, 128, 255) rgba(64, 128, 255, 0.5)
 */
Color.parse = function(str) {
  var
    r = 0, g = 0, b = 0, a = 1,
    m;

  str = (''+ str).toLowerCase();
  str = w3cColors[str] || str;

  if ((m = str.match(/^#(\w{2})(\w{2})(\w{2})$/))) {
    r = parseInt(m[1], 16);
    g = parseInt(m[2], 16);
    b = parseInt(m[3], 16);
  } else if ((m = str.match(/rgba?\((\d+)\D+(\d+)\D+(\d+)(\D+([\d.]+))?\)/))) {
    r = parseInt(m[1], 10);
    g = parseInt(m[2], 10);
    b = parseInt(m[3], 10);
    a = m[4] ? parseFloat(m[5]) : 1;
  } else {
    return;
  }

  return this.fromRGBA(r, g, b, a);
};

Color.fromRGBA = function(r, g, b, a) {
  if (typeof r === 'object') {
    g = r.g / 255;
    b = r.b / 255;
    a = (r.a !== undefined ? r.a : 1);
    r = r.r / 255;
  } else {
    r /= 255;
    g /= 255;
    b /= 255;
    a = (a !== undefined ? a : 1);
  }

  var
    max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    h, s, l = (max+min) / 2,
    d = max-min;

  if (!d) {
    h = s = 0; // achromatic
  } else {
    s = l > 0.5 ? d / (2-max-min) : d / (max+min);
    switch (max) {
      case r: h = (g-b) / d + (g < b ? 6 : 0); break;
      case g: h = (b-r) / d + 2; break;
      case b: h = (r-g) / d + 4; break;
    }
    h *= 60;
  }

  return new Color(h, s, l, a);
};

Color.prototype = {

  toRGBA: function(normalized) {
    var
      h = clamp(this.H, 360),
      s = clamp(this.S, 1),
      l = clamp(this.L, 1),
      rgba = { a: clamp(this.A, 1) };

    // achromatic
    if (s === 0) {
      rgba.r = l;
      rgba.g = l;
      rgba.b = l;
    } else {
      var
        q = l < 0.5 ? l * (1+s) : l + s - l*s,
        p = 2 * l-q;
        h /= 360;

      rgba.r = hue2rgb(p, q, h + 1/3);
      rgba.g = hue2rgb(p, q, h);
      rgba.b = hue2rgb(p, q, h - 1/3);
    }

    if (normalized) {
      return rgba;
    }

    return {
      r: Math.round(rgba.r*255),
      g: Math.round(rgba.g*255),
      b: Math.round(rgba.b*255),
      a: rgba.a
    };
  },

  toString: function() {
    var rgba = this.toRGBA();

    if (rgba.a === 1) {
      return '#' + ((1 <<24) + (rgba.r <<16) + (rgba.g <<8) + rgba.b).toString(16).slice(1, 7);
    }
    return 'rgba(' + [rgba.r, rgba.g, rgba.b, rgba.a.toFixed(2)].join(',') + ')';
  },

  hue: function(h) {
    return new Color(this.H*h, this.S, this.L, this.A);
  },

  saturation: function(s) {
    return new Color(this.H, this.S*s, this.L, this.A);
  },

  lightness: function(l) {
    return new Color(this.H, this.S, this.L*l, this.A);
  },

  alpha: function(a) {
    return new Color(this.H, this.S, this.L, this.A*a);
  }
};

return Color; }(this));

var document = global.document;

function clamp(value, min, max) {
  return Math.min(max, Math.max(value, min));
}

var GLMap = function(container, options) {
  this.container = typeof container === 'string' ? document.getElementById(container) : container;
  options = options || {};

  this.container.classList.add('glmap-container');
  this.width = this.container.offsetWidth;
  this.height = this.container.offsetHeight;

  this.minZoom = parseFloat(options.minZoom) || 10;
  this.maxZoom = parseFloat(options.maxZoom) || 20;

  if (this.maxZoom < this.minZoom) {
    this.maxZoom = this.minZoom;
  }

  this.center = { x:0, y:0 };
  this.zoom = 0;

  this.listeners = {};

  this.restoreState(options);

  if (options.state) {
    this.persistState();
    this.on('change', function() {
      this.persistState();
    }.bind(this));
  }

  this.interaction = new Interaction(this, this.container);
  this.layers      = new Layers(this);

  if (options.disabled) {
    this.setDisabled(true);
  }

  this.attribution = options.attribution;
  this.attributionDiv = document.createElement('DIV');
  this.attributionDiv.className = 'glmap-attribution';
  this.container.appendChild(this.attributionDiv);
  this.updateAttribution();
};

GLMap.TILE_SIZE = 256;

GLMap.prototype = {

  updateAttribution: function() {
    var attribution = this.layers.getAttribution();
    if (this.attribution) {
      attribution.unshift(this.attribution);
    }
    this.attributionDiv.innerHTML = attribution.join(' &middot; ');
  },

  restoreState: function(options) {
    var
      query = location.search,
      state = {};
    if (query) {
      query.substring(1).replace(/(?:^|&)([^&=]*)=?([^&]*)/g, function($0, $1, $2) {
        if ($1) {
          state[$1] = $2;
        }
      });
    }

    var position;
    if (state.lat !== undefined && state.lon !== undefined) {
      position = { latitude:parseFloat(state.lat), longitude:parseFloat(state.lon) };
    }
    this.setPosition(position || options.position || { latitude: 52.52000, longitude: 13.41000 });

    var zoom;
    if (state.zoom !== undefined) {
      zoom = (state.zoom !== undefined) ? parseFloat(state.zoom) : null;
    }
    this.setZoom(zoom || options.zoom || this.minZoom);

    var rotation;
    if (state.rotation !== undefined) {
      rotation = parseFloat(state.rotation);
    }
    this.setRotation(rotation || options.rotation || 0);

    var tilt;
    if (state.tilt !== undefined) {
      tilt = parseFloat(state.tilt);
    }
    this.setTilt(tilt || options.tilt || 0);

    var bend;
    if (state.bend !== undefined) {
      bend = parseFloat(state.bend);
    }
    this.setBend(bend || options.bend || 0);
  },

  persistState: function() {
    if (!history.replaceState) {
      return;
    }

    if (this.stateDebounce) {
      return;
    }

    this.stateDebounce = setTimeout(function() {
      this.stateDebounce = null;
      var params = [];
      params.push('lat=' + this.position.latitude.toFixed(5));
      params.push('lon=' + this.position.longitude.toFixed(5));
      params.push('zoom=' + this.zoom.toFixed(1));
      params.push('tilt=' + this.tilt.toFixed(1));
      params.push('bend=' + this.bend.toFixed(1));
      params.push('rotation=' + this.rotation.toFixed(1));
      history.replaceState({}, '', '?'+ params.join('&'));
    }.bind(this), 1000);
  },

  setCenter: function(center) {
    if (this.center.x !== center.x || this.center.y !== center.y) {
      this.center = center;
      this.position = this.unproject(center.x, center.y, GLMap.TILE_SIZE*Math.pow(2, this.zoom));
      this.emit('change');
    }
  },

  emit: function(type, payload) {
    if (!this.listeners[type]) {
      return;
    }

    var listeners = this.listeners[type];

    if (listeners.timer) {
      return;
    }

    listeners.timer = setTimeout(function() {
      for (var i = 0, il = listeners.fn.length; i < il; i++) {
        listeners.fn[i](payload);
      }
      listeners.timer = null;
    }.bind(this), 17);
  },

  //***************************************************************************

  on: function(type, fn) {
    if (!this.listeners[type]) {
      this.listeners[type] = { fn:[] };
    }
    this.listeners[type].fn.push(fn);
    return this;
  },

  off: function(type, fn) {},

  setDisabled: function(flag) {
    this.interaction.disabled = !!flag;
    return this;
  },

  isDisabled: function() {
    return !!this.interaction.disabled;
  },

  project: function(latitude, longitude, worldSize) {
    var
      x = longitude/360 + 0.5,
      y = Math.min(1, Math.max(0, 0.5 - (Math.log(Math.tan((Math.PI/4) + (Math.PI/2)*latitude/180)) / Math.PI) / 2));
    return { x: x*worldSize, y: y*worldSize };
  },

  unproject: function(x, y, worldSize) {
    x /= worldSize;
    y /= worldSize;
    return {
      latitude: (2 * Math.atan(Math.exp(Math.PI * (1 - 2*y))) - Math.PI/2) * (180/Math.PI),
      longitude: x*360 - 180
    };
  },

  getBounds: function() {
    var
      W2 = this.width/2, H2 = this.height/2,
      angle = this.rotation*Math.PI/180,
      x = Math.cos(angle)*W2 - Math.sin(angle)*H2,
      y = Math.sin(angle)*W2 + Math.cos(angle)*H2,
      center = this.center,
      worldSize = GLMap.TILE_SIZE*Math.pow(2, this.zoom),
      nw = this.unproject(center.x - x, center.y - y, worldSize),
      se = this.unproject(center.x + x, center.y + y, worldSize);
    return {
      n: nw.latitude,
      w: nw.longitude,
      s: se.latitude,
      e: se.longitude
    };
  },

  setZoom: function(zoom, e) {
    zoom = clamp(parseFloat(zoom), this.minZoom, this.maxZoom);

    if (this.zoom !== zoom) {
      var ratio = Math.pow(2, zoom-this.zoom);
      this.zoom = zoom;
      if (!e) {
        this.center.x *= ratio;
        this.center.y *= ratio;
      } else {
        var dx = this.container.offsetWidth/2  - e.clientX;
        var dy = this.container.offsetHeight/2 - e.clientY;
        this.center.x -= dx;
        this.center.y -= dy;
        this.center.x *= ratio;
        this.center.y *= ratio;
        this.center.x += dx;
        this.center.y += dy;
      }
      this.emit('change');
    }
    return this;
  },

  getZoom: function() {
    return this.zoom;
  },

  setPosition: function(pos) {
    var
      latitude  = clamp(parseFloat(pos.latitude), -90, 90),
      longitude = clamp(parseFloat(pos.longitude), -180, 180),
      center = this.project(latitude, longitude, GLMap.TILE_SIZE*Math.pow(2, this.zoom));
    this.setCenter(center);
    return this;
  },

  getPosition: function() {
    return this.position;
  },

  setSize: function(size) {
    if (size.width !== this.width || size.height !== this.height) {
      this.width = size.width;
      this.height = size.height;
      this.emit('resize');
    }
    return this;
  },

  getSize: function() {
    return { width: this.width, height: this.height };
  },

  setRotation: function(rotation) {
    rotation = parseFloat(rotation)%360;
    if (this.rotation !== rotation) {
      this.rotation = rotation;
      this.emit('change');
    }
    return this;
  },

  getRotation: function() {
    return this.rotation;
  },

  setTilt: function(tilt) {
    tilt = clamp(parseFloat(tilt), 0, 60);
    if (this.tilt !== tilt) {
      this.tilt = tilt;
      this.emit('change');
    }
    return this;
  },

  getTilt: function() {
    return this.tilt;
  },

  setBend: function(bend) {
    bend = clamp(parseFloat(bend), 0, 90);
    if (this.bend !== bend) {
      this.bend = bend;
      this.emit('change');
    }
    return this;
  },

  getBend: function() {
    return this.bend;
  },

  addLayer: function(layer) {
    this.layers.add(layer);
    this.updateAttribution();
    return this;
  },

  removeLayer: function(layer) {
    this.layers.remove(layer);
    this.updateAttribution();
  },

  destroy: function() {
    this.listeners = null;
    this.interaction.destroy();
    this.layers.destroy();
  }
};

//*****************************************************************************

if (typeof global.define === 'function') {
  global.define([], GLMap);
} else if (typeof global.exports === 'object') {
  global.module.exports = GLMap;
} else {
  global.GLMap = GLMap;
}


function addListener(target, type, fn) {
  target.addEventListener(type, fn, false);
}

function removeListener(target, type, fn) {
  target.removeEventListener(type, fn, false);
}

function cancelEvent(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  e.returnValue = false;
}

var Interaction = function(map, container) {
  this.map = map;

  if ('ontouchstart' in global) {
    addListener(container, 'touchstart', this.onTouchStart.bind(this));
    addListener(document, 'touchmove', this.onTouchMove.bind(this));
    addListener(document, 'touchend', this.onTouchEnd.bind(this));
    addListener(container, 'gesturechange', this.onGestureChange.bind(this));
  } else {
    addListener(container, 'mousedown', this.onMouseDown.bind(this));
    addListener(document, 'mousemove', this.onMouseMove.bind(this));
    addListener(document, 'mouseup', this.onMouseUp.bind(this));
    addListener(container, 'dblclick', this.onDoubleClick.bind(this));
    addListener(container, 'mousewheel', this.onMouseWheel.bind(this));
    addListener(container, 'DOMMouseScroll', this.onMouseWheel.bind(this));
  }

  var resizeDebounce;
  addListener(global, 'resize', function() {
    if (resizeDebounce) {
      return;
    }
    resizeDebounce = setTimeout(function() {
      resizeDebounce = null;
      map.setSize({ width:container.offsetWidth, height:container.offsetHeight });
    }, 250);
  });
};

Interaction.prototype = {

  prevX: 0,
  prevY: 0,
  startX: 0,
  startY: 0,
  startZoom: 0,
  prevRotation: 0,
  prevTilt: 0,
  disabled: false,
  pointerIsDown: false,

  onDoubleClick: function(e) {
    if (this.disabled) {
      return;
    }
    cancelEvent(e);
    this.map.setZoom(this.map.zoom + 1, e);
  },

  onMouseDown: function(e) {
    if (this.disabled || e.button>1) {
      return;
    }

    cancelEvent(e);

    this.startZoom = this.map.zoom;
    this.prevRotation = this.map.rotation;
    this.prevTilt = this.map.tilt;

    this.startX = this.prevX = e.clientX;
    this.startY = this.prevY = e.clientY;

    this.pointerIsDown = true;

    this.map.emit('pointerdown', { x: e.clientX, y: e.clientY });
  },

  onMouseMove: function(e) {
    if (this.disabled) {
      return;
    }

    if (this.pointerIsDown) {
      if (e.button === 0 && !e.altKey) {
        this.moveMap(e);
      } else {
        this.rotateMap(e);
      }

      this.prevX = e.clientX;
      this.prevY = e.clientY;
    }

    this.map.emit('pointermove', { x: e.clientX, y: e.clientY });
  },

  onMouseUp: function(e) {
    if (this.disabled) {
      return;
    }

    // prevents clicks on other page elements
    if (!this.pointerIsDown) {
      return;
    }

    if (e.button === 0 && !e.altKey) {
      if (Math.abs(e.clientX - this.startX)>5 || Math.abs(e.clientY - this.startY)>5) {
        this.moveMap(e);
      }
    } else {
      this.rotateMap(e);
    }

    this.pointerIsDown = false;

    this.map.emit('pointerup', { x: e.clientX, y: e.clientY });
  },

  onMouseWheel: function(e) {
    if (this.disabled) {
      return;
    }
    cancelEvent(e);
    var delta = 0;
    if (e.wheelDeltaY) {
      delta = e.wheelDeltaY;
    } else if (e.wheelDelta) {
      delta = e.wheelDelta;
    } else if (e.detail) {
      delta = -e.detail;
    }

    var adjust = 0.2*(delta>0 ? 1 : delta<0 ? -1 : 0);
    this.map.setZoom(this.map.zoom + adjust, e);
  },

  moveMap: function(e) {
    var dx = e.clientX - this.prevX;
    var dy = e.clientY - this.prevY;
    var angle = this.map.rotation * Math.PI/180;
    // rotate point
    var r = {
      x: Math.cos(angle)*dx - Math.sin(angle)*dy,
      y: Math.sin(angle)*dx + Math.cos(angle)*dy
    };
    this.map.setCenter({ x: this.map.center.x - r.x, y: this.map.center.y - r.y });
  },

  rotateMap: function(e) {
    this.prevRotation += (e.clientX - this.prevX)*(360/innerWidth);
    this.prevTilt -= (e.clientY - this.prevY)*(360/innerHeight);
    this.map.setRotation(this.prevRotation);
    this.map.setTilt(this.prevTilt);
  },

  //***************************************************************************

  onTouchStart: function(e) {
    if (this.disabled) {
      return;
    }

    cancelEvent(e);

    this.startZoom = this.map.zoom;
    this.prevRotation = this.map.rotation;
    this.prevTilt = this.map.tilt;

    if (e.touches.length>1) {
      e = e.touches[0];
    }

    this.startX = this.prevX = e.clientX;
    this.startY = this.prevY = e.clientY;

    this.map.emit('pointerdown', { x: e.clientX, y: e.clientY });
  },

  onTouchMove: function(e) {
    if (this.disabled) {
      return;
    }

    if (e.touches.length>1) {
      e = e.touches[0];
    }

    this.moveMap(e);

    this.prevX = e.clientX;
    this.prevY = e.clientY;

    this.map.emit('pointermove', { x: e.clientX, y: e.clientY });
  },

  onTouchEnd: function(e) {
    if (this.disabled) {
      return;
    }

    if (e.touches.length>1) {
      e = e.touches[0];
    }

    if (Math.abs(e.clientX - this.startX)>5 || Math.abs(e.clientY - this.startY)>5) {
      this.moveMap(e);
    }

    this.map.emit('pointerup', { x: e.clientX, y: e.clientY });
  },

  onGestureChange: function(e) {
    if (this.disabled) {
      return;
    }
    cancelEvent(e);
    this.map.setZoom(this.startZoom + (e.scale - 1));
    this.map.setRotation(this.prevRotation - e.rotation);
//  this.map.setTilt(prevTilt ...);
  },

  destroy: function() {
    this.disabled = true;
  }
};


var Layers = function(map) {
  this.map = map;
  this.items = [];
};

Layers.prototype = {

  add: function(layer) {
    this.items.push(layer);
  },

  remove: function(layer) {
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i] === layer) {
        this.items.splice(i, 1);
        return;
      }
    }
  },

  getAttribution: function() {
    var attribution = [];
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i].attribution) {
        attribution.push(this.items[i].attribution);
      }
    }
    return attribution;
  },

  destroy: function() {
    for (var i = 0; i < this.items.length; i++) {
      this.items[i].destroy();
    }
    this.items = null;
  }
};


function distance2(a, b) {
  var dx = a[0]-b[0], dy = a[1]-b[1];
  return dx*dx + dy*dy;
}

GLMap.TileLayer = function(source, options) {
  this.source = source;
  options = options || {};

  this.attribution = options.attribution;

  this.minZoom = parseFloat(options.minZoom) || 0;
  this.maxZoom = parseFloat(options.maxZoom) || 18;

  if (this.maxZoom < this.minZoom) {
    this.maxZoom = this.minZoom;
  }

  this.buffer = options.buffer || 1;

  this.tiles = {};
};

GLMap.TileLayer.prototype = {

  addTo: function(map) {
    this.map = map;
    map.addLayer(this);

    map.on('change', function() {
      this.update(2000);
    }.bind(this));

    map.on('resize', this.update.bind(this));

    this.update();
  },

  remove: function() {
    clearTimeout(this.isWaiting);
    this.map.removeLayer(this);
    this.map = null;
  },

  // strategy: start loading after {delay}ms, skip any attempts until then
  // effectively loads in intervals during movement
  update: function(delay) {
    var map = this.map;

    if (map.zoom < this.minZoom || map.zoom > this.maxZoom) {
      return;
    }

    if (!delay) {
      this.loadTiles();
      return;
    }

    if (this.isWaiting) {
      return;
    }

    this.isWaiting = setTimeout(function() {
      this.isWaiting = null;
      this.loadTiles();
    }.bind(this), delay);
  },

  getURL: function(x, y, z) {
    var param = { s:'abcd'[(x+y) % 4], x:x, y:y, z:z };
    return this.source.replace(/\{(\w+)\}/g, function(tag, key) {
      return param[key] || tag;
    });
  },

  updateBounds: function() {
    var
      map = this.map,
      tileZoom = Math.round(map.zoom),
      radius = 1500, // SkyDome.radius,
      ratio = Math.pow(2, tileZoom-map.zoom)/GLMap.TILE_SIZE,
      mapCenter = map.center;

    this.minX = ((mapCenter.x-radius)*ratio <<0);
    this.minY = ((mapCenter.y-radius)*ratio <<0);
    this.maxX = Math.ceil((mapCenter.x+radius)*ratio);
    this.maxY = Math.ceil((mapCenter.y+radius)*ratio);
  },

  loadTiles: function() {
    this.updateBounds();

    var
      map = this.map,
      tileX, tileY,
      tileZoom = Math.round(map.zoom),
      key,
      queue = [], queueLength,
      tileAnchor = [
        map.center.x/GLMap.TILE_SIZE <<0,
        map.center.y/GLMap.TILE_SIZE <<0
      ];

    for (tileY = this.minY; tileY < this.maxY; tileY++) {
      for (tileX = this.minX; tileX < this.maxX; tileX++) {
        key = [tileX, tileY, tileZoom].join(',');
        if (this.tiles[key]) {
          continue;
        }
        this.tiles[key] = new GLMap.Tile(tileX, tileY, tileZoom);
        // TODO: rotate anchor point
        queue.push({ tile:this.tiles[key], dist:distance2([tileX, tileY], tileAnchor) });
      }
    }

    if (!(queueLength = queue.length)) {
      return;
    }

    queue.sort(function(a, b) {
      return a.dist-b.dist;
    });

    var tile;
    for (var i = 0; i < queueLength; i++) {
      tile = queue[i].tile;
      tile.load(this.getURL(tile.x, tile.y, tile.zoom));
    }

    this.purge();
  },

  purge: function() {
    for (var key in this.tiles) {
      if (!this.isVisible(this.tiles[key], this.buffer)) {
        this.tiles[key].destroy();
        delete this.tiles[key];
      }
    }
  },

  isVisible: function(tile, buffer) {
     buffer = buffer || 0;
     var
       tileX = tile.x,
       tileY = tile.y,
       tileZoom = Math.round(this.map.zoom);
     // TODO: factor in tile origin
     return (tile.zoom === tileZoom && (tileX >= this.minX-buffer && tileX <= this.maxX+buffer && tileY >= this.minY-buffer && tileY <= this.maxY+buffer));
  },

  destroy: function() {
    for (var key in this.tiles) {
      this.tiles[key].destroy();
    }
    this.tiles = null;
    this.remove();
  }
};


GLMap.Tile = function(x, y, zoom) {
  this.x = x;
  this.y = y;
  this.zoom = zoom;
};

GLMap.Tile.prototype = {
  load: function() {},
  destroy: function() {}
};
}(this));