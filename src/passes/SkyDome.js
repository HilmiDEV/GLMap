
var SkyDome = {};

(function() {

  var shader;

  var baseRadius = 500;

  var vertexBuffer;
  var texCoordBuffer;
  var texture;
  var textureIsLoaded;

  var latSegments = 8;
  var lonSegments = 24;

  function createDome(radius) {
    var
      res = { vertices: [], texCoords: [] },
      sin = Math.sin,
      cos = Math.cos,
      PI = Math.PI,
      azimuth1, x1, y1,
      azimuth2, x2, y2,
      polar1,
      polar2,
      A, B, C, D,
      tcLeft,
      tcRight,
      tcTop,
      tcBottom;

    for (var i = 0, j; i < lonSegments; i++) {
      tcLeft = i/lonSegments;
      azimuth1 = tcLeft*2*PI; // convert to radiants [0...2*PI]
      x1 = cos(azimuth1)*radius;
      y1 = sin(azimuth1)*radius;

      tcRight = (i+1)/lonSegments;
      azimuth2 = tcRight*2*PI;
      x2 = cos(azimuth2)*radius;
      y2 = sin(azimuth2)*radius;

      for (j = 0; j < latSegments; j++) {
        polar1 = j*PI/(latSegments*2); //convert to radiants in [0..1/2*PI]
        polar2 = (j+1)*PI/(latSegments*2);

        A = [x1*cos(polar1), y1*cos(polar1), radius*sin(polar1)];
        B = [x2*cos(polar1), y2*cos(polar1), radius*sin(polar1)];
        C = [x2*cos(polar2), y2*cos(polar2), radius*sin(polar2)];
        D = [x1*cos(polar2), y1*cos(polar2), radius*sin(polar2)];

        res.vertices.push.apply(res.vertices, A);
        res.vertices.push.apply(res.vertices, B);
        res.vertices.push.apply(res.vertices, C);
        res.vertices.push.apply(res.vertices, A);
        res.vertices.push.apply(res.vertices, C);
        res.vertices.push.apply(res.vertices, D);

        tcTop    = 1 - (j+1)/latSegments;
        tcBottom = 1 - j/latSegments;

        res.texCoords.push(tcLeft, tcBottom, tcRight, tcBottom, tcRight, tcTop, tcLeft, tcBottom, tcRight, tcTop, tcLeft, tcTop);
      }
    }

    return res;
  }

  SkyDome.init = function(map, options) {
    var url = 'skydome.jpg';

    var tris = createDome(baseRadius);

    this.resize();
    Events.on('resize', this.resize.bind(this));

    shader = new glx.Shader({
      vertexShader: Shaders.skydome.vertex,
      fragmentShader: Shaders.skydome.fragment,
      attributes: ["aPosition", "aTexCoord"],
      uniforms: ["uMatrix", "uTileImage", "uFogColor"]
    });

    this.fogColor = options.fogColor;

    vertexBuffer = new glx.Buffer(3, new Float32Array(tris.vertices));
    texCoordBuffer = new glx.Buffer(2, new Float32Array(tris.texCoords));
    Activity.setBusy();
    texture = new glx.texture.Image(url, function(image) {
      Activity.setIdle();
      if (image) {
        textureIsLoaded = true;
      }
    });

    return this;
  };

  SkyDome.resize = function() {
    this.radius = Math.sqrt(MAP.width*MAP.width + MAP.height*MAP.height) / 1; // 2 would fit fine but camera is too close
  };

  SkyDome.render = function(vpMatrix) {
    if (!textureIsLoaded) {
      return;
    }

    var gl = MAP.getContext();

    shader.enable();

    gl.uniform3fv(shader.uniforms.uFogColor, [this.fogColor.r, this.fogColor.g, this.fogColor.b]);

    var mMatrix = new glx.Matrix();
    var scale = this.radius/baseRadius;
    mMatrix.scale(scale, scale, scale);

    var mvp = glx.Matrix.multiply(mMatrix, vpMatrix);
    gl.uniformMatrix4fv(shader.uniforms.uMatrix, false, mvp);

    vertexBuffer.enable();
    gl.vertexAttribPointer(shader.attributes.aPosition, vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    texCoordBuffer.enable();
    gl.vertexAttribPointer(shader.attributes.aTexCoord, texCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    texture.enable(0);
    gl.uniform1i(shader.uniforms.uTileImage, 0);

    gl.drawArrays(gl.TRIANGLES, 0, vertexBuffer.numItems);

    shader.disable();
  };

}());
