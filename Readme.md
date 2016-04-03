# Pinch-zoom

Pinch an image or div for zoom.

[Demo](https://chemzqm.github.io/pinch-zoom)

## Features

* Pinch to zoom.
* Scale back with animation when exceed maximun scale level ( default 5).
* Drag element with animation and sceen edge limitation.
* Tap to reset transform status with animation.
* Reset transform status when scale level below zero.
* Restore to sane position when insane padding exists.
* Emit `tap` and `swipe` event when reasonable.
* No interrapt with `touchmove` event when not scaled and move left/right.
* Use 3d transform when possible and requestAnimationFrame to imporve
  performance.

## Example

``` css
#viewport {
  width: 100vw;
  height: 100vh;
  position: relative;
  background-color: #000;
  overflow: hidden;
}
.wrapper {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  margin-top: -80px;
}
.wrapper > img {
  width: 100%;
  display: block;
  height: auto;
}
```

``` html
<div id="viewport">
  <div class="wrapper">
    <img src="./one.jpg" alt="">
  </div>
</div>
```

``` js
var pinchZoom = require('pinch-zoom')
var el = document.querySelector('.wrapper')
var pzoom = pinchZoom(el, {
  draggable true,
  maxScale: 4
})
```

## API

### PinchZoom(el , [opt])

Init PinchZoom with element and optional opt, `el` should not have `transform`
and `transition` style.

* `opt.maxScale` maximun scale for element, default `5`.
* `opt.draggable` make element draggable with one finger, default `false`.
* `opt.threshold` threshold for fast swipe event in ms, default `200`
* `opt.fastThreshold` limist moved distance for fast swipe in pixel, default `40`

### .animate(o, duration, [ease])

Animation base element with options.

* `o.x` translateX.
* `o.y` translateY.
* `o.scale` value for `scale()` or `scale3d()`.
* `duration` animation duration in ms.
* `ease` ease function name, default `out-circ`

### .reset()

Reset to initial state with animation.

### .unbind()

Reset trasform style and unbind all events.
