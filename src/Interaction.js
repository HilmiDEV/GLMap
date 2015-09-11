
var Interaction = {};

(function() {

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

  //***************************************************************************

  var
    prevX = 0, prevY = 0,
    startX = 0, startY  = 0,
    startZoom = 0,
    prevRotation = 0,
    prevTilt = 0,
    button,
    stepX, stepY,
    pointerIsDown = false;

  function onDragStart(e) {
    if (Interaction.isDisabled || e.button > 1) {
      return;
    }

    cancelEvent(e);

    startZoom = Map.zoom;
    prevRotation = Map.rotation;
    prevTilt = Map.tilt;

    stepX = 360/innerWidth;
    stepY = 360/innerHeight;

    if (e.touches === undefined) {
      button = e.button;
    } else {
      if (e.touches.length > 1) {
        return;
      }
      e = e.touches[0];
    }

    startX = prevX = e.clientX;
    startY = prevY = e.clientY;

    pointerIsDown = true;
  }

  function onDragMove(e) {
    if (Interaction.isDisabled || !pointerIsDown) {
      return;
    }

    if (e.touches !== undefined) {
      if (e.touches.length > 1) {
        return;
      }
      e = e.touches[0];
    }

    if ((e.touches !== undefined || button === 0) && !e.altKey) {
      moveMap(e);
    } else {
      prevRotation += (e.clientX - prevX)*stepX;
      prevTilt     -= (e.clientY - prevY)*stepY;
      Map.setRotation(prevRotation);
      Map.setTilt(prevTilt);
    }

    prevX = e.clientX;
    prevY = e.clientY;
  }

  function onDragEnd(e) {
    if (Interaction.isDisabled || !pointerIsDown) {
      return;
    }

    if (e.touches !== undefined) {
      if (e.touches.length>1) {
        return;
      }
      e = e.touches[0];
    }

    if ((e.touches !== undefined || button === 0) && !e.altKey) {
      if (Math.abs(e.clientX-startX) < 5 && Math.abs(e.clientY-startY) < 5) {
        onClick(e);
      } else {
        moveMap(e);
      }
    } else {
      prevRotation += (e.clientX - prevX)*stepX;
      prevTilt     -= (e.clientY - prevY)*stepY;
      Map.setRotation(prevRotation);
      Map.setTilt(prevTilt);
    }

    pointerIsDown = false;
  }

  function onGestureChange(e) {
    if (Interaction.isDisabled) {
      return;
    }
    cancelEvent(e);
    Map.setZoom(startZoom + (e.scale - 1));
    Map.setRotation(prevRotation - e.rotation);
//  Map.setTilt(prevTilt ...);
  }

  function onDoubleClick(e) {
    if (Interaction.isDisabled) {
      return;
    }
    cancelEvent(e);
    Map.setZoom(Map.zoom + 1, e);
  }

  function onClick(e) {
    if (Interaction.isDisabled) {
      return;
    }
    cancelEvent(e);
    // Interaction.getFeatureID({ x:e.clientX, y:e.clientY }, function(featureID) {
    //   Events.emit('click', { target: { id:featureID } });
    // });
  }

  function onMouseWheel(e) {
    if (Interaction.isDisabled) {
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
    Map.setZoom(Map.zoom + adjust, e);
  }

  function moveMap(e) {
    var dx = e.clientX - prevX;
    var dy = e.clientY - prevY;
    var r = rotatePoint(dx, dy, Map.rotation*Math.PI/180);
//    Map.setCenter({ x:Map.center.x-r.x, y:Map.center.y-r.y });
  }

  function rotatePoint(x, y, angle) {
    return {
      x: Math.cos(angle)*x - Math.sin(angle)*y,
      y: Math.sin(angle)*x + Math.cos(angle)*y
    };
  }

  //***************************************************************************

  Interaction.init = function(container) {
    var hasTouch = ('ontouchstart' in global);
    addListener(container, hasTouch ? 'touchstart' : 'mousedown', onDragStart);
    addListener(container, 'dblclick', onDoubleClick);
    addListener(document, hasTouch ? 'touchmove' : 'mousemove', onDragMove);
    addListener(document, hasTouch ? 'touchend' : 'mouseup', onDragEnd);

    if (hasTouch) {
      addListener(container, 'gesturechange', onGestureChange);
    } else {
      addListener(container, 'mousewheel', onMouseWheel);
      addListener(container, 'DOMMouseScroll', onMouseWheel);
    }

    var resizeTimer;
    addListener(global, 'resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        Events.emit('resize');
      }, 250);
    });
  };

  Interaction.setDisabled = function(flag) {
    Interaction.isDisabled = !!flag;
  };

  Interaction.destroy = function() {};

}());
