
var SkyDome = function(map) {
  this.map = map;

  var geometry = this.createGeometry(this.baseRadius);
  this.vertexBuffer   = new glx.Buffer(3, new Float32Array(geometry.vertices));
  this.texCoordBuffer = new glx.Buffer(2, new Float32Array(geometry.texCoords));

  this.shader = new glx.Shader({
    vertexShader: Shaders.skydome.vertex,
    fragmentShader: Shaders.skydome.fragment,
    attributes: ["aPosition", "aTexCoord"],
    uniforms: ["uMatrix", "uTexIndex", "uFogColor"]
  });

//Activity.setBusy();
  var url = 'GLMap/skydome.jpg';
  this.texture = new glx.texture.Image(url, function(image) {
//  Activity.setIdle();
    if (image) {
      this.isReady = true;
    }
  }.bind(this));
};

SkyDome.prototype = {

  baseRadius: 500,

  createGeometry: function(radius) {
    var
      latSegments = 8,
      lonSegments = 24,
      vertices = [],
      texCoords = [],
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

        vertices.push.apply(vertices, A);
        vertices.push.apply(vertices, B);
        vertices.push.apply(vertices, C);
        vertices.push.apply(vertices, A);
        vertices.push.apply(vertices, C);
        vertices.push.apply(vertices, D);

        tcTop    = 1 - (j+1)/latSegments;
        tcBottom = 1 - j/latSegments;

        texCoords.push(tcLeft, tcBottom, tcRight, tcBottom, tcRight, tcTop, tcLeft, tcBottom, tcRight, tcTop, tcLeft, tcTop);
      }
    }

    return { vertices: vertices, texCoords: texCoords };
  },

  render: function(transformMatrix, projectionMatrix) {
    if (!this.isReady) {
      return;
    }

    var
      map = this.map,
      gl = glx.context,
      fogColor = map.fogColor,
      shader = this.shader;

    shader.enable();

    gl.uniform3fv(shader.uniforms.uFogColor, [fogColor.r, fogColor.g, fogColor.b]);

    var modelMatrix = new glx.Matrix();
    var scale = map.renderer.fogRadius/this.baseRadius;
    modelMatrix.scale(scale, scale, scale);

    var transformProjectionMatrix = new glx.Matrix(glx.Matrix.multiply(transformMatrix, projectionMatrix));
    gl.uniformMatrix4fv(shader.uniforms.uMatrix, false, glx.Matrix.multiply(modelMatrix, transformProjectionMatrix));

    this.vertexBuffer.enable();
    gl.vertexAttribPointer(shader.attributes.aPosition, this.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    this.texCoordBuffer.enable();
    gl.vertexAttribPointer(shader.attributes.aTexCoord, this.texCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    this.texture.enable(0);
    gl.uniform1i(shader.uniforms.uTexIndex, 0);

    gl.drawArrays(gl.TRIANGLES, 0, this.vertexBuffer.numItems);

    shader.disable();
  },

  destroy: function() {
    this.texture.destroy();
  }
};
